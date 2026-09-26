import calendar
from datetime import timedelta
from zoneinfo import ZoneInfo


def next_due(task, zone):
    local = task.due_at.astimezone(ZoneInfo(str(zone)))
    if task.repeat_rule in ['monthly', 'yearly']:
        month = local.month + (1 if task.repeat_rule == 'monthly' else 12)
        year = local.year + (month - 1) // 12
        month = (month - 1) % 12 + 1
        day = min(task.recurrence_day or local.day, calendar.monthrange(year, month)[1])
        return local.replace(year=year, month=month, day=day)
    days = 7 if task.repeat_rule == 'weekly' else task.repeat_days
    return local + timedelta(days=days) if days else None
