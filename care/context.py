from django.utils import timezone

def common(request):
    from .membership import member, cookie_choices
    name = request.resolver_match.url_name if request.resolver_match else ''
    page_icon = 'pets' if 'pet' in name or name in ['journey','signup','login'] else 'calendar' if any(word in name for word in ['calendar','task','reminder']) else 'map' if name in ['find-care','provider'] else 'bowl' if 'supply' in name else 'giving' if 'community' in name else 'sitting' if 'service' in name else 'flight' if 'plan' in name or name == 'life' else 'healthy' if 'record' in name or name == 'overview' else 'community'
    page_icon = {'park':'outdoors','outdoors':'outdoors','vet':'vet','cafe':'cafe','cafes':'cafe','hotel':'hotel','stays':'hotel','sports':'sports','training':'training','enrichment':'play','roadtrips':'road','flying':'flight','sitter':'sitting','shop':'bowl','boarding':'hotel'}.get(request.GET.get('category'), page_icon)
    return {'page_icon':page_icon,'today': timezone.localdate(), 'owner_timezone': str(timezone.get_current_timezone()), 'nav_pets': request.user.pet_set.all() if request.user.is_authenticated else [], 'is_member':member(request), 'cookie_choices':cookie_choices(request)}
