from datetime import timedelta
from zoneinfo import ZoneInfo
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone
from care.models import Preferences, Task, Supply, Notification, ServiceCache


class Command(BaseCommand):
    help = 'Generate in-app reminders and submit opted-in emails. Run every 5 minutes.'

    def handle(self, *args, **options):
        now = timezone.now()
        generated = 0
        for prefs in Preferences.objects.select_related('user').all():
            local = now.astimezone(ZoneInfo(prefs.timezone))
            candidates = []
            for task in Task.objects.filter(pet__owner=prefs.user, status='pending').select_related('pet', 'plan'):
                lifestyle = task.kind in ['training', 'sport', 'outing', 'travel', 'celebration', 'preparation']
                if (lifestyle and not prefs.adventure_reminders) or (not lifestyle and not prefs.care_reminders):
                    continue
                if task.plan_id and task.plan.status != 'planned':
                    continue
                if task.reminder_snoozed_until and task.reminder_snoozed_until > now:
                    continue
                offsets = task.reminder_offsets if task.reminder_offsets is not None else [task.reminder_days*1440]
                eligible = [m for m in offsets if task.due_at-timedelta(minutes=m) <= now]
                if not eligible:
                    continue
                offset = min(eligible)
                # Precisely requested event alerts are not delayed to the daily digest hour.
                if offset >= 1440 and local.hour < prefs.reminder_hour and not task.reminder_snoozed_until:
                    continue
                snooze = ':' + task.reminder_snoozed_until.isoformat() if task.reminder_snoozed_until else ''
                lead_key = f':{offset}' if task.reminder_offsets is not None else ''
                candidates.append((f'task:{task.pk}:{task.due_at.isoformat()}{lead_key}{snooze}', f'{task.pet.name}: {task.title} is due {task.due_at.astimezone(ZoneInfo(prefs.timezone)):%d %b, %H:%M}.'))
            if prefs.supply_reminders and local.hour >= prefs.reminder_hour:
                for supply in Supply.objects.filter(pet__owner=prefs.user).select_related('pet'):
                    if supply.needs_order:
                        candidates.append((f'supply:{supply.pk}:{local.date().isocalendar().year}-{local.date().isocalendar().week}', f'{supply.pet.name}: check {supply.product}. Recorded stock: {supply.quantity} {supply.unit}; allow {supply.delivery_days} days for delivery.'))
            for key, title in candidates:
                notification, created = Notification.objects.get_or_create(key=key, defaults={'user': prefs.user, 'title': title[:250]})
                if created:
                    generated += 1
                if not prefs.email_reminders or not prefs.user.email:
                    continue
                if settings.EMAIL_BACKEND != 'django.core.mail.backends.smtp.EmailBackend':
                    continue
                # Claim before network I/O. Do not automatically resend ambiguous sends.
                claimed = Notification.objects.filter(pk=notification.pk, status='in_app').update(status='sending')
                if not claimed:
                    continue
                try:
                    send_mail('A little care reminder · Your Pet Care', title + '\n\nOpen Your Pet Care to review your schedule and stock.', settings.DEFAULT_FROM_EMAIL, [prefs.user.email], fail_silently=False)
                    Notification.objects.filter(pk=notification.pk).update(status='submitted', sent_at=timezone.now())
                except Exception:
                    Notification.objects.filter(pk=notification.pk).update(status='uncertain', error='Email submission failed or is uncertain. Reminder remains in app; check mail logs before retrying.')
        ServiceCache.objects.filter(expires_at__lt=now-timedelta(days=1)).delete()
        self.stdout.write(self.style.SUCCESS(f'{generated} new reminders; existing delivery keys preserved.'))
