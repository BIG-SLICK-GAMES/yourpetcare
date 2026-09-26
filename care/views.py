import calendar
import json
import zipfile
from copy import copy
from io import BytesIO
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.core import serializers
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, HttpResponse, JsonResponse, Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST
from .models import Pet, Task, Supply, HealthRecord, Timeline, Preferences, Provider, ListingRequest, Notification, Audit, LifePlan
from .forms import SignupForm, PetForm, TaskForm, SupplyForm, RecordForm, PreferencesForm, ListingForm
from .services import finish_task, count_metric


def home(request):
    if not request.user.is_authenticated:
        return render(request, 'care/welcome.html')
    pets = Pet.objects.filter(owner=request.user)
    tasks = Task.objects.filter(pet__owner=request.user, status='pending').select_related('pet', 'provider').order_by('due_at')
    supplies = [s for s in Supply.objects.filter(pet__owner=request.user).select_related('pet', 'supplier') if s.needs_order]
    if request.session.get('active_day') != str(timezone.localdate()):
        count_metric('active_sessions')
        request.session['active_day'] = str(timezone.localdate())
    return render(request, 'care/home.html', {'pets': pets, 'tasks': tasks[:5], 'task_count': tasks.count(), 'overdue_count': tasks.filter(due_at__lt=timezone.now()).count(), 'supplies': supplies, 'plans': LifePlan.objects.filter(owner=request.user, status='planned').prefetch_related('pets').order_by('start_at')[:3], 'timeline': Timeline.objects.filter(pet__owner=request.user).select_related('pet')[:6]})


def signup(request):
    form = SignupForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        Preferences.objects.create(user=user)
        login(request, user)
        return redirect('pet-add')
    return render(request, 'care/form.html', {'form': form, 'title': 'A little care starts here.', 'subtitle': 'Create your free account. Your pets’ records stay private.', 'button': 'Create account'})


@login_required
def pets(request):
    return render(request, 'care/pets.html', {'pets': Pet.objects.filter(owner=request.user)})


@login_required
def pet_detail(request, pk):
    pet = get_object_or_404(Pet, pk=pk, owner=request.user)
    weights = list(pet.records.exclude(weight_kg=None).order_by('recorded_at'))
    points = []
    if weights:
        lo = min(r.weight_kg for r in weights)
        hi = max(r.weight_kg for r in weights)
        span = hi - lo or 1
        points = [{'x': 20 + i * 560 / max(1, len(weights) - 1), 'y': 110 - float((r.weight_kg - lo) / span) * 80, 'record': r} for i, r in enumerate(weights)]
    return render(request, 'care/pet.html', {'pet': pet, 'tasks': pet.tasks.filter(status='pending').order_by('due_at'), 'records': pet.records.order_by('-recorded_at'), 'timeline': pet.timeline.all(), 'weights': weights, 'weight_points': points, 'weight_line': ' '.join(f'{p["x"]},{p["y"]}' for p in points)})


@login_required
def edit(request, kind, pk=None):
    mapping = {'pet': (Pet, PetForm, 'pet'), 'task': (Task, TaskForm, 'care item'), 'supply': (Supply, SupplyForm, 'supply'), 'record': (HealthRecord, RecordForm, 'health record')}
    model, form_class, label = mapping[kind]
    instance = None
    if pk:
        instance = get_object_or_404(model, pk=pk, **({'owner': request.user} if kind == 'pet' else {'pet__owner': request.user}))
        if kind == 'task' and instance.plan_id and instance.plan_step == 'event':
            return redirect('plan-edit', pk=instance.plan_id)
    initial = {}
    if kind == 'task' and request.GET.get('routine') == 'training':
        initial.update(title='Our training practice', kind='training', repeat_rule='weekly', due_at=timezone.localtime()+timedelta(days=1), reminder_offsets=[30], reminder_days=0)
    if request.GET.get('pet'):
        initial['pet'] = get_object_or_404(Pet, pk=request.GET['pet'], owner=request.user)
    if request.GET.get('provider') and kind in ['task', 'supply']:
        initial['provider' if kind == 'task' else 'supplier'] = get_object_or_404(Provider, pk=request.GET['provider'])
        if kind == 'task':
            initial.update(kind='appointment', location=initial['provider'].address)
    form = form_class(request.POST or None, request.FILES or None, instance=instance, user=request.user, initial=initial)
    if request.method == 'POST' and form.is_valid():
        with transaction.atomic():
            obj = form.save(commit=False)
            if kind == 'pet':
                obj.owner = request.user
            if kind == 'supply' and 'quantity' in form.changed_data:
                obj.stock_updated_at = timezone.now()
            if kind == 'task' and (not pk or 'due_at' in form.changed_data):
                obj.recurrence_day = timezone.localtime(obj.due_at).day
                obj.reminder_snoozed_until = None
            obj.save()
            pet = obj if kind == 'pet' else obj.pet
            Timeline.objects.create(pet=pet, title=f'{label.capitalize()} {"updated" if pk else "added"}', notes=str(getattr(obj, 'title', getattr(obj, 'product', pet.name))))
            if kind == 'record':
                existing = Task.objects.filter(source_record=obj).first()
                if obj.follow_up_at and (not existing or existing.status == 'pending'):
                    Task.objects.update_or_create(source_record=obj, defaults={'pet': pet, 'title': f'Follow up: {obj.title}', 'due_at': obj.follow_up_at, 'notes': obj.notes})
                elif not obj.follow_up_at:
                    Task.objects.filter(source_record=obj, status='pending').delete()
        messages.success(request, f'{label.capitalize()} saved.')
        return redirect('pet-detail', pk=pet.pk) if kind in ['pet', 'record'] else redirect('calendar' if kind == 'task' else 'supplies')
    return render(request, 'care/pet_form.html' if kind == 'pet' else 'care/form.html', {'form': form, 'title': f'{"Edit" if pk else "Add"} {label}', 'subtitle': 'Only record what you know. Optional details can be added later.', 'button': 'Save ' + label})


@login_required
def care_calendar(request):
    try:
        month = datetime.strptime(request.GET.get('month', timezone.localdate().strftime('%Y-%m')), '%Y-%m').date().replace(day=1)
        if not 1900 <= month.year <= 2100:
            raise ValueError()
    except ValueError:
        month = timezone.localdate().replace(day=1)
    tasks = Task.objects.filter(pet__owner=request.user).select_related('pet', 'provider').order_by('due_at')
    if request.GET.get('pet', '').isdigit():
        tasks = tasks.filter(pet_id=int(request.GET['pet']))
    if request.GET.get('state') in ['pending', 'completed', 'skipped', 'cancelled']:
        tasks = tasks.filter(status=request.GET['state'])
    if request.GET.get('kind') in dict(Task.KINDS):
        tasks = tasks.filter(kind=request.GET['kind'])
    month_tasks = []
    from .scheduling import next_due
    month_end = month.replace(day=calendar.monthrange(month.year, month.month)[1])
    for task in tasks:
        cursor = task
        for _ in range(5000):
            date = timezone.localtime(cursor.due_at).date()
            if date > month_end:
                break
            if date >= month:
                month_tasks.append(cursor)
            if task.status != 'pending' or not (task.repeat_days or task.repeat_rule):
                break
            following = next_due(cursor, timezone.get_current_timezone())
            projected = copy(cursor)
            projected.due_at = following
            projected.recurrence_day = task.recurrence_day or timezone.localtime(task.due_at).day
            projected.end_at = following + (task.end_at-task.due_at) if task.end_at else None
            projected.projected = True
            cursor = projected
    month_tasks.sort(key=lambda task: task.due_at)
    cells = []
    for date in calendar.Calendar(firstweekday=0).itermonthdates(month.year, month.month):
        cells.append({'date': date, 'current': date.month == month.month, 'tasks': [t for t in month_tasks if timezone.localtime(t.due_at).date() == date]})
    return render(request, 'care/calendar.html', {'cells': cells, 'tasks': month_tasks, 'kinds': Task.KINDS, 'calendar_view': request.GET.get('view', 'month'), 'month': month, 'prev': (month-timedelta(days=1)).strftime('%Y-%m'), 'next': (month+timedelta(days=32)).strftime('%Y-%m')})


@login_required
@require_POST
def task_action(request, pk):
    task = get_object_or_404(Task, pk=pk, pet__owner=request.user)
    status = request.POST.get('action')
    if status in ['completed', 'skipped', 'cancelled']:
        finish_task(task.pk, request.user, status)
        messages.success(request, 'Care timeline updated.')
    elif status == 'snooze' and task.status == 'pending':
        task.reminder_snoozed_until = timezone.now() + timedelta(hours=1)
        task.save(update_fields=['reminder_snoozed_until'])
        messages.success(request, 'Reminder snoozed for one hour. The event time has not changed.')
    if task.plan_id:
        return redirect('plan-detail', pk=task.plan_id)
    return redirect('reminders' if request.POST.get('return_to') == 'reminders' else 'calendar')


@login_required
def reminders(request):
    now = timezone.now()
    tasks = Task.objects.filter(pet__owner=request.user, status='pending').select_related('pet', 'plan').order_by('due_at')
    actionable = []
    for task in tasks:
        if task.plan and task.plan.status != 'planned':
            continue
        offsets = task.reminder_offsets if task.reminder_offsets is not None else [task.reminder_days * 1440]
        if offsets and task.due_at - timedelta(minutes=max(offsets)) <= now:
            actionable.append(task)
    return render(request, 'care/reminders.html', {'tasks': actionable, 'notifications': Notification.objects.filter(user=request.user).order_by('-created_at')[:30]})


@login_required
def supplies(request):
    return render(request, 'care/supplies.html', {'supplies': Supply.objects.filter(pet__owner=request.user).select_related('pet', 'supplier')})


@login_required
@require_POST
@transaction.atomic
def supply_action(request, pk):
    supply = get_object_or_404(Supply.objects.select_for_update(), pk=pk, pet__owner=request.user)
    action = request.POST.get('action')
    title = None
    if action == 'ordered' and not supply.ordered_at:
        supply.ordered_at = timezone.now()
        title = f'{supply.product}: marked ordered by owner'
    elif action == 'snooze':
        supply.snoozed_until = timezone.localdate() + timedelta(days=3)
        title = f'{supply.product}: reminder snoozed for 3 days'
    elif action in ['correct', 'received']:
        try:
            quantity = Decimal(request.POST.get('quantity', ''))
            if not quantity.is_finite() or quantity < 0 or quantity > 9999999 or quantity.as_tuple().exponent < -2:
                raise ValueError()
        except (InvalidOperation, ValueError):
            messages.error(request, 'Enter a non-negative quantity with up to two decimal places.')
            return redirect('supplies')
        supply.quantity = quantity
        supply.stock_updated_at = timezone.now()
        if action == 'received':
            supply.ordered_at = None
        supply.snoozed_until = None
        title = f'{supply.product}: {"received; " if action == "received" else ""}stock recorded as {quantity} {supply.unit}'
    if title:
        supply.save()
        Timeline.objects.create(pet=supply.pet, title=title)
        messages.success(request, title)
    return redirect('supplies')


@login_required
def settings_view(request):
    prefs, _ = Preferences.objects.get_or_create(user=request.user)
    form = PreferencesForm(request.POST or None, instance=prefs)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Reminder preferences saved.')
        return redirect('settings')
    return render(request, 'care/settings.html', {'form': form, 'notifications': Notification.objects.filter(user=request.user).order_by('-created_at')[:30], 'email_live': settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend'})


@login_required
def private_file(request, kind, pk):
    if kind == 'photo':
        obj = get_object_or_404(Pet, pk=pk, owner=request.user)
        field = obj.photo
    else:
        obj = get_object_or_404(HealthRecord, pk=pk, pet__owner=request.user)
        field = obj.document
    if not field:
        raise Http404
    response = FileResponse(field.open('rb'), as_attachment=kind != 'photo', filename=field.name.rsplit('/', 1)[-1])
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    return response


@login_required
def export_data(request):
    data = {}
    for name, query in {'pets': Pet.objects.filter(owner=request.user), 'plans': LifePlan.objects.filter(owner=request.user), 'tasks': Task.objects.filter(pet__owner=request.user), 'supplies': Supply.objects.filter(pet__owner=request.user), 'health': HealthRecord.objects.filter(pet__owner=request.user), 'timeline': Timeline.objects.filter(pet__owner=request.user), 'preferences': Preferences.objects.filter(user=request.user), 'notifications': Notification.objects.filter(user=request.user), 'listing_requests': ListingRequest.objects.filter(user=request.user)}.items():
        data[name] = json.loads(serializers.serialize('json', query))
    data['account'] = {'username': request.user.username, 'email': request.user.email}
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('your-pet-care.json', json.dumps(data, indent=2))
        fields = [p.photo for p in Pet.objects.filter(owner=request.user) if p.photo] + [r.document for r in HealthRecord.objects.filter(pet__owner=request.user) if r.document]
        for field in fields:
            if field.storage.exists(field.name):
                with field.open('rb') as source:
                    archive.writestr('files/' + field.name, source.read())
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename='your-pet-care-export.zip')


@login_required
@require_POST
def delete_account(request):
    if request.POST.get('confirm') != 'DELETE' or not request.user.check_password(request.POST.get('password', '')):
        messages.error(request, 'Enter DELETE and your current password to delete your account.')
        return redirect('settings')
    user = request.user
    for pet in Pet.objects.filter(owner=user):
        if pet.photo:
            pet.photo.delete(save=False)
        for record in pet.records.all():
            if record.document:
                record.document.delete(save=False)
    ListingRequest.objects.filter(user=user).delete()
    logout(request)
    user.delete()
    messages.success(request, 'Your account and private records have been deleted.')
    return redirect('home')


def ics_escape(value):
    return str(value).replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '').replace(',', '\\,').replace(';', '\\;')


@login_required
def calendar_export(request):
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Your Pet Care//Care calendar//EN']
    for task in Task.objects.filter(pet__owner=request.user, status='pending').select_related('pet', 'provider'):
        lines.extend(['BEGIN:VEVENT', f'UID:care-{task.pk}@yourpetcare', 'DTSTAMP:' + timezone.now().strftime('%Y%m%dT%H%M%SZ'), 'DTSTART:' + task.due_at.astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ'), 'SUMMARY:' + ics_escape(task.pet.name + ': ' + task.title), 'DESCRIPTION:' + ics_escape(task.notes), 'LOCATION:' + ics_escape(task.location or (task.provider.address if task.provider else '')), 'END:VEVENT'])
        lines.pop()
        if task.end_at:
            lines.append('DTEND:' + task.end_at.astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
        offsets = task.reminder_offsets if task.reminder_offsets is not None else [task.reminder_days * 1440]
        for offset in offsets:
            lines.extend(['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + ics_escape(task.title), f'TRIGGER:-PT{offset}M' if offset else 'TRIGGER:PT0M', 'END:VALARM'])
        lines.append('END:VEVENT')
    lines.append('END:VCALENDAR')
    folded = []
    for line in lines:
        chunk = ''
        for char in line:
            if len((chunk + char).encode('utf-8')) > 73:
                folded.append(chunk)
                chunk = ' '
            chunk += char
        folded.append(chunk)
    response = HttpResponse('\r\n'.join(folded) + '\r\n', content_type='text/calendar')
    response['Content-Disposition'] = 'attachment; filename="pet-care.ics"'
    return response


@login_required
def listing_request(request):
    initial = {'contact_email': request.user.email, 'provider': request.GET.get('provider'), 'kind': request.GET.get('kind', 'new')}
    form = ListingForm(request.POST or None, user=request.user, initial=initial)
    if request.method == 'POST' and form.is_valid():
        obj = form.save(commit=False)
        obj.user = request.user
        obj.save()
        count_metric('listing_requests')
        messages.success(request, 'Submitted for review. This does not verify or publish a listing.')
        return redirect('my-requests')
    return render(request, 'care/form.html', {'form': form, 'title': 'Help local care get found', 'subtitle': 'Submit a listing, ownership claim or correction for review.', 'button': 'Submit for review'})


@login_required
def my_requests(request):
    return render(request, 'care/requests.html', {'requests': ListingRequest.objects.filter(user=request.user).order_by('-created_at')})


def privacy(request):
    return render(request, 'care/privacy.html')
