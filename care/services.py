from datetime import timedelta
from zoneinfo import ZoneInfo
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from .models import Task, Supply, Timeline, Metric, Preferences
from .scheduling import next_due


def count_metric(name):
    metric, _ = Metric.objects.get_or_create(day=timezone.localdate(), name=name)
    Metric.objects.filter(pk=metric.pk).update(count=F('count') + 1)


@transaction.atomic
def finish_task(task_id, owner, status):
    task = Task.objects.select_for_update().get(pk=task_id, pet__owner=owner)
    if task.status != 'pending':
        return False
    # Conditional update provides a second guard against duplicate form submissions.
    changed = Task.objects.filter(pk=task.pk, status='pending').update(status=status, completed_at=timezone.now())
    if not changed:
        return False
    note = task.notes
    if status == 'completed' and task.supply_id and task.units_used:
        supply = Supply.objects.select_for_update().get(pk=task.supply_id)
        if supply.quantity < task.units_used:
            note += '\nRecorded stock was lower than usage. Stock is now zero; please correct the count.'
        supply.quantity = max(0, supply.quantity - task.units_used)
        supply.stock_updated_at = timezone.now()
        supply.save()
    Timeline.objects.create(pet=task.pet, title=f'{task.title} · {status}', notes=note)
    if (task.repeat_days or task.repeat_rule) and status != 'cancelled':
        prefs, _ = Preferences.objects.get_or_create(user=owner)
        local_due = task.due_at.astimezone(ZoneInfo(prefs.timezone))
        # Advance from the scheduled occurrence, preserving late/missed occurrences.
        following = next_due(task, prefs.timezone)
        Task.objects.create(pet=task.pet, title=task.title, kind=task.kind, due_at=following, end_at=following+(task.end_at-task.due_at) if task.end_at else None, repeat_days=task.repeat_days, repeat_rule=task.repeat_rule, recurrence_day=task.recurrence_day or local_due.day, reminder_days=task.reminder_days, reminder_offsets=task.reminder_offsets, provider=task.provider, location=task.location, notes=task.notes, supply=task.supply, units_used=task.units_used)
    if status == 'completed' and task.follow_up_at:
        Task.objects.create(pet=task.pet, title=f'Follow up: {task.title}', due_at=task.follow_up_at, provider=task.provider, notes=task.notes)
    count_metric('reminder_' + status)
    if task.plan_id and not task.plan.tasks.filter(status='pending', plan_step='event').exists():
        task.plan.status = 'completed' if not task.plan.tasks.filter(plan_step='event', status='cancelled').exists() else 'cancelled'
        task.plan.save(update_fields=['status'])
    return True
