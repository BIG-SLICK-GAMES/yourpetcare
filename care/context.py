from django.utils import timezone

def common(request):
    return {'today': timezone.localdate(), 'owner_timezone': str(timezone.get_current_timezone()), 'nav_pets': request.user.pet_set.all() if request.user.is_authenticated else []}
