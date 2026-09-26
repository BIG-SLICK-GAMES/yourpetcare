import json
from urllib.parse import urlencode
from django.contrib import messages
from django.shortcuts import redirect, render, get_object_or_404
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST
from .models import Provider, SavedProvider


def member(request):
    return request.user.is_authenticated and request.user.has_usable_password()


def local_next(request, value, default='/'):
    return value if value and url_has_allowed_host_and_scheme(value, allowed_hosts={request.get_host()}, require_https=request.is_secure()) else default


def account_link(request, destination=None):
    return reverse('signup') + '?' + urlencode({'next': destination or request.get_full_path()})


def cookie_choices(request):
    try:
        value = json.loads(request.get_signed_cookie('ypc_cookie_choices', default='null', salt='cookie-choices-v1', max_age=60*60*24*180))
        return value if isinstance(value, dict) and value.get('version') == 1 and isinstance(value.get('advertising'), bool) else None
    except (ValueError, TypeError):
        return None


def cookies(request):
    choices = cookie_choices(request)
    if request.method == 'POST':
        action = request.POST.get('choice')
        if action not in ['all', 'essential', 'custom']:
            return render(request, 'care/cookies.html', {'choices': choices, 'error': 'Choose your cookie preference.'}, status=400)
        advertising = action == 'all' or (action == 'custom' and request.POST.get('advertising') == 'on')
        response = redirect(local_next(request, request.POST.get('next'), '/'))
        response.set_signed_cookie('ypc_cookie_choices', json.dumps({'version':1, 'advertising':advertising}), salt='cookie-choices-v1', max_age=60*60*24*180, httponly=True, secure=request.is_secure(), samesite='Lax')
        return response
    return render(request, 'care/cookies.html', {'choices': choices})


def saved_services(request):
    saved = SavedProvider.objects.filter(owner=request.user).select_related('provider') if member(request) else []
    return render(request, 'care/saved_services.html', {'saved_services': saved})


@require_POST
def save_service(request, pk):
    provider = get_object_or_404(Provider, pk=pk)
    if not member(request):
        return redirect(account_link(request, reverse('provider', args=[pk])))
    if request.POST.get('action') == 'remove':
        SavedProvider.objects.filter(owner=request.user, provider=provider).delete()
        messages.success(request, 'Removed from your saved services.')
    else:
        SavedProvider.objects.get_or_create(owner=request.user, provider=provider)
        messages.success(request, 'Saved for another day.')
    return redirect(local_next(request, request.POST.get('next'), reverse('provider', args=[pk])))
