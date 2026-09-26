import hashlib
import math
from datetime import timedelta
from urllib.parse import urlencode, urlparse
import requests
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction, IntegrityError
from django.shortcuts import render, get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.http import require_POST
from .models import Provider, Pet, ServiceCache, Timeline
from .services import count_metric


class DiscoveryError(Exception):
    pass


def safe_url(url):
    return url if urlparse(url).scheme in ['https', 'http'] else ''


def fetch_cached(service, key, url, params, ttl, method='get'):
    cache_key = service + ':' + hashlib.sha256(key.encode()).hexdigest()
    now = timezone.now()
    cached = ServiceCache.objects.filter(key=cache_key, expires_at__gt=now).first()
    if cached:
        return cached.data
    # Shared database lock: cache and global throttle also work across web workers.
    lock_key = 'lock:' + service
    with transaction.atomic():
        ServiceCache.objects.get_or_create(key=lock_key, defaults={'expires_at': now})
        changed = ServiceCache.objects.filter(key=lock_key, expires_at__lte=now).update(expires_at=now + timedelta(seconds=2 if service == 'geocode' else 15))
    if not changed:
        raise DiscoveryError('Location search is busy. Please try again in a few seconds.')
    try:
        response = requests.request(method, url, params=params if method == 'get' else None, data=params if method == 'post' else None, headers={'User-Agent': settings.OSM_USER_AGENT}, timeout=25)
        response.raise_for_status()
        data = response.json()
        if isinstance(data, dict) and data.get('remark'):
            raise DiscoveryError('The map data service returned an incomplete result. Please try again later.')
    except (requests.RequestException, ValueError):
        raise DiscoveryError('The map data service is temporarily unavailable. Previously fetched listings are still shown; try again later.')
    ServiceCache.objects.update_or_create(key=cache_key, defaults={'data': data, 'expires_at': now + timedelta(seconds=ttl)})
    return data


def geocode(query):
    data = fetch_cached('geocode', query.lower(), settings.NOMINATIM_URL, {'q': query, 'format': 'jsonv2', 'countrycodes': 'au', 'limit': 1}, 86400 * 30)
    if not data:
        raise DiscoveryError('We could not find that Australian suburb or postcode. Try adding the state.')
    return float(data[0]['lat']), float(data[0]['lon'])


def import_nearby(lat, lon, outings=False):
    selectors = ['["amenity"="veterinary"]', '["shop"="pet"]', '["shop"="pet_grooming"]', '["amenity"="animal_boarding"]', '["amenity"="animal_training"]', '["craft"="pet_sitter"]']
    if outings:
        selectors = ['["amenity"~"^(cafe|restaurant|pub|bar)$"]["dog"~"^(yes|leashed)$"]', '["tourism"~"^(hotel|motel|guest_house|camp_site)$"]["dog"~"^(yes|leashed)$"]', '["leisure"="dog_park"]']
    query = '[out:json][timeout:20];(' + ''.join(f'nwr(around:12000,{lat:.3f},{lon:.3f}){s};' for s in selectors) + ');out center tags 150;'
    data = fetch_cached('providers', f'{lat:.3f},{lon:.3f}:{"outings" if outings else "care"}', settings.OVERPASS_URL, {'data': query}, 86400, method='post')
    for element in data.get('elements', []):
        tags = element.get('tags', {})
        if not tags.get('name'):
            continue
        center = element.get('center', element)
        if 'lat' not in center or 'lon' not in center:
            continue
        category = 'other'
        if tags.get('amenity') == 'veterinary': category = 'vet'
        elif tags.get('shop') == 'pet_grooming': category = 'groomer'
        elif tags.get('shop') == 'pet': category = 'shop'
        elif tags.get('amenity') == 'animal_boarding': category = 'boarding'
        elif tags.get('amenity') == 'animal_training': category = 'trainer'
        elif tags.get('craft') == 'pet_sitter': category = 'sitter'
        elif tags.get('leisure') == 'dog_park': category = 'park'
        elif tags.get('tourism') in ['hotel', 'motel', 'guest_house', 'camp_site']: category = 'hotel'
        elif tags.get('amenity') in ['cafe', 'restaurant', 'pub', 'bar']: category = 'cafe'
        osm_id = f'{element["type"]}/{element["id"]}'
        # Preserve admin-reviewed edits when refreshing upstream listings.
        existing = Provider.objects.filter(osm_id=osm_id).first()
        if existing and existing.verified_at:
            continue
        address = ', '.join(filter(None, [' '.join(filter(None, [tags.get('addr:housenumber'), tags.get('addr:street')])), tags.get('addr:suburb'), tags.get('addr:city'), tags.get('addr:postcode')]))
        policy = ('Community map tags dogs as ' + tags['dog'] + '. Confirm current animal, seating and access rules directly.') if outings and tags.get('dog') else ('Community-mapped dog park. Check posted access and lead rules.' if category == 'park' else '')
        Provider.objects.update_or_create(osm_id=osm_id, defaults={'name': tags['name'][:200], 'category': category, 'address': address[:400], 'lat': center['lat'], 'lon': center['lon'], 'phone': tags.get('phone', tags.get('contact:phone', ''))[:80], 'website': safe_url(tags.get('website', tags.get('contact:website', '')))[:200], 'hours': tags.get('opening_hours', '')[:300], 'pet_policy': policy, 'source': 'https://www.openstreetmap.org/' + osm_id})


def distance(lat, lon, provider):
    p1, p2 = math.radians(lat), math.radians(provider.lat)
    delta = math.radians(provider.lon-lon)
    a = math.sin((p2-p1)/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(delta/2)**2
    return 6371 * 2 * math.asin(math.sqrt(min(1, a)))


def find_care(request):
    query = request.GET.get('q', '').strip()[:150]
    lat, lon = -27.4698, 153.0251
    error = ''
    category = request.GET.get('category', '')
    searched = bool(query or request.GET.get('lat'))
    try:
        if request.GET.get('lat'):
            lat, lon = float(request.GET['lat']), float(request.GET.get('lon', ''))
            if not math.isfinite(lat) or not math.isfinite(lon) or not (-44 <= lat <= -10 and 112 <= lon <= 154):
                raise ValueError()
        elif query:
            lat, lon = geocode(query)
        if searched:
            import_nearby(lat, lon, outings=category in ['cafe', 'hotel', 'park'])
    except (ValueError, TypeError):
        lat, lon = -27.4698, 153.0251
        error = 'Enter a valid Australian location.'
    except DiscoveryError as exc:
        error = str(exc)
    providers = Provider.objects.all()
    if category in dict(Provider.CATEGORIES):
        providers = providers.filter(category=category)
    if category == 'emergency':
        providers = providers.filter(emergency_verified_at__gt=timezone.now()-timedelta(days=7))
    results = []
    for provider in providers:
        provider.distance = round(distance(lat, lon, provider), 1)
        if provider.distance <= 15:
            results.append(provider)
    results.sort(key=lambda p: p.distance)
    markers = [{'id': p.pk, 'name': p.name, 'lat': p.lat, 'lon': p.lon, 'category': p.get_category_display()} for p in results]
    return render(request, 'care/find.html', {'providers': results, 'markers': markers, 'center': [lat, lon], 'query': query, 'category': category, 'categories': Provider.CATEGORIES, 'error': error, 'searched': searched, 'tile_url': settings.TILE_URL})


def provider_detail(request, pk):
    provider = get_object_or_404(Provider, pk=pk)
    directions = 'https://www.google.com/maps/dir/?' + urlencode({'api': 1, 'destination': f'{provider.lat},{provider.lon}'})
    return render(request, 'care/provider.html', {'provider': provider, 'directions': directions})


@login_required
@require_POST
def attach_provider(request, pk):
    provider = get_object_or_404(Provider, pk=pk)
    pet = get_object_or_404(Pet, pk=request.POST.get('pet'), owner=request.user)
    pet.preferred_vet = provider
    pet.save(update_fields=['preferred_vet'])
    Timeline.objects.create(pet=pet, title='Preferred provider updated', notes=provider.name)
    messages.success(request, f'{provider.name} saved to {pet.name}.')
    return redirect('pet-detail', pk=pet.pk)


@require_POST
def contact_provider(request, pk):
    provider = get_object_or_404(Provider, pk=pk)
    if safe_url(provider.website):
        count_metric('provider_website_contacts')
        return redirect(provider.website)
    return redirect('provider', pk=pk)
