from zoneinfo import ZoneInfo
from django.utils import timezone
from .models import Preferences
import hashlib
from datetime import timedelta
from django.db import transaction
from django.http import HttpResponse
from .models import ServiceCache


class LocalPreviewMiddleware:
    """Isolated, passwordless browser workspace, explicitly enabled on loopback only."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        from django.contrib.auth import login, logout, get_user_model
        import uuid
        import ipaddress
        local = request.META.get('REMOTE_ADDR') in ['127.0.0.1', '::1']
        try:
            peer = ipaddress.ip_address(request.META.get('REMOTE_ADDR', ''))
            local = local or any(peer in ipaddress.ip_network(network) for network in settings.PREVIEW_NETWORKS)
        except ValueError:
            pass
        if request.session.get('local_preview') and (not settings.LOCAL_PREVIEW or not local):
            logout(request)
        excluded = request.path.startswith(('/admin/', '/accounts/', '/static/', '/files/'))
        if request.user.is_authenticated and request.user.has_usable_password():
            request.session.pop('local_preview', None)
        if settings.LOCAL_PREVIEW and local and not excluded and not request.user.is_authenticated:
            user = get_user_model().objects.create_user(username='preview_' + uuid.uuid4().hex, password=None)
            Preferences.objects.create(user=user)
            login(request, user)
            request.session['local_preview'] = True
            request.session.set_expiry(60 * 60 * 24 * 30)
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        from .membership import member, account_link
        from django.shortcuts import redirect
        protected = {'pet-picture', 'pet-photo', 'pet-add', 'pet-edit', 'pet-personality', 'task-add', 'task-edit', 'task-action', 'supply-add', 'supply-edit', 'supply-action', 'record-add', 'record-edit', 'plan-add', 'plan-edit', 'plan-action', 'quick-plan', 'offer-service', 'listing-request', 'attach-provider'}
        if request.resolver_match.url_name in protected and not member(request):
            return redirect(account_link(request))
        if request.resolver_match.url_name == 'settings' and request.method == 'POST' and not member(request):
            return redirect(account_link(request))

class OwnerTimezoneMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        zone = 'Australia/Brisbane'
        if request.user.is_authenticated:
            prefs, _ = Preferences.objects.get_or_create(user=request.user)
            zone = prefs.timezone
        timezone.activate(ZoneInfo(zone))
        try:
            response = self.get_response(request)
            if request.user.is_authenticated:
                response['Cache-Control'] = 'private, no-store'
            return response
        finally:
            timezone.deactivate()


class AuthThrottleMiddleware:
    """Local/shared-database throttle, using the direct peer rather than untrusted proxy headers."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'POST' and request.path in ['/accounts/login/', '/accounts/signup/', '/accounts/password_reset/', '/admin/login/']:
            key = 'auth-rate:' + hashlib.sha256(request.META.get('REMOTE_ADDR', '').encode()).hexdigest()
            now = timezone.now()
            with transaction.atomic():
                limit, _ = ServiceCache.objects.get_or_create(key=key, defaults={'data': {'count': 0}, 'expires_at': now+timedelta(minutes=15)})
                if limit.expires_at <= now:
                    limit.data = {'count': 0}
                    limit.expires_at = now+timedelta(minutes=15)
                count = limit.data.get('count', 0)
                if count >= 20:
                    response = HttpResponse('Too many sign-in or account requests. Please wait 15 minutes and try again.', status=429, content_type='text/plain')
                    response['Retry-After'] = '900'
                    return response
                limit.data = {'count': count+1}
                limit.save()
        return self.get_response(request)
