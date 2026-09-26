import uuid
import json
from datetime import datetime, timedelta
from io import StringIO, BytesIO
from zipfile import ZipFile
from unittest.mock import patch
from zoneinfo import ZoneInfo
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.management import call_command
from django.utils import timezone
from .models import Pet, LifePlan, Task, Preferences, Notification, Supply
from .ideas import IDEAS, suggestions
from .services import finish_task


class LifeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user('planner', 'planner@example.test', 'planner-test-pass-192!')
        cls.other = User.objects.create_user('someoneelse', password='other-safe-pass-192!')
        Preferences.objects.create(user=cls.owner, reminder_hour=0, supply_reminders=False)
        cls.dog = Pet.objects.create(owner=cls.owner, name='Stormy', species='Dog')
        cls.cat = Pet.objects.create(owner=cls.owner, name='Mochi', species='Cat')
        cls.foreign = Pet.objects.create(owner=cls.other, name='Other pet')

    def setUp(self):
        self.client.force_login(self.owner)

    def payload(self, **extra):
        payload = {'pets': [self.dog.pk, self.cat.pk], 'title': 'Weekend away', 'start_at': (timezone.localtime()+timedelta(days=40)).strftime('%Y-%m-%dT10:00'), 'confirmation': 'idea', 'reminder_offsets': [1440, 120], 'selected_steps': ['policy', 'pack'], 'creation_token': str(uuid.uuid4())}
        payload.update(extra)
        return payload

    def create_plan(self, **extra):
        payload = self.payload(**extra)
        response = self.client.post('/plans/new/hotel/', payload)
        self.assertEqual(response.status_code, 302, response.content.decode()[:1000])
        return LifePlan.objects.get(title=payload['title']), payload

    def test_all_new_pages_render(self):
        for path in ['/life/', f'/pets/{self.dog.pk}/personality/', '/plans/new/flight/', '/reminders/', '/calendar/?view=agenda']:
            self.assertEqual(self.client.get(path).status_code, 200, path)

    def test_personality_and_species_aware_suggestions(self):
        response = self.client.post(f'/pets/{self.dog.pk}/personality/', {'personality': 'Curious, a little shy', 'training_level': 'starting', 'energy_level': 'balanced', 'social_comfort': 'quiet', 'interests': ['training', 'cafes'], 'goals': 'Settle at a café'})
        self.assertEqual(response.status_code, 302)
        self.dog.refresh_from_db()
        self.assertIsNotNone(self.dog.profile_completed_at)
        self.assertEqual(suggestions(self.dog)[0]['key'], 'training')
        self.assertNotIn('agility', [i['key'] for i in suggestions(self.cat)])

    def test_age_is_calculated_and_future_birth_rejected(self):
        self.dog.date_of_birth = timezone.localdate().replace(year=timezone.localdate().year-3)
        self.assertEqual(self.dog.age_display, '3 years old')
        response = self.client.post(f'/pets/{self.dog.pk}/personality/', {'date_of_birth': (timezone.localdate()+timedelta(days=1)).isoformat()})
        self.assertContains(response, 'Date of birth cannot be in the future.')

    def test_multi_pet_plan_is_atomic_and_idempotent(self):
        plan, payload = self.create_plan()
        self.assertEqual(plan.pets.count(), 2)
        self.assertEqual(plan.tasks.count(), 6)
        self.client.post('/plans/new/hotel/', payload)
        self.assertEqual(LifePlan.objects.count(), 1)
        self.assertEqual(plan.tasks.count(), 6)
        self.assertEqual(self.client.get(f'/plans/{plan.pk}/').status_code, 200)

    def test_cannot_add_foreign_pet_or_read_foreign_plan(self):
        response = self.client.post('/plans/new/hotel/', self.payload(pets=[self.foreign.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(LifePlan.objects.count(), 0)
        plan, _ = self.create_plan()
        self.client.force_login(self.other)
        for path in [f'/plans/{plan.pk}/', f'/plans/{plan.pk}/edit/', f'/pets/{self.dog.pk}/personality/']:
            self.assertEqual(self.client.get(path).status_code, 404)
        self.assertEqual(self.client.post(f'/plans/{plan.pk}/action/', {'action': 'cancel'}).status_code, 404)

    def test_dog_only_starter_rejects_cat(self):
        self.client.post('/plans/new/agility/', self.payload(pets=[self.cat.pk], selected_steps=[]))
        self.assertEqual(LifePlan.objects.count(), 0)

    def test_move_plan_preserves_completed_history_and_shifts_pending(self):
        plan, payload = self.create_plan()
        edit = self.client.get(f'/plans/{plan.pk}/edit/')
        self.assertEqual(edit.context['form']['title'].value(), plan.title)
        done = plan.tasks.get(pet=self.dog, plan_step='policy')
        finish_task(done.pk, self.owner, 'completed')
        original = {t.pk:t.due_at for t in plan.tasks.all()}
        payload['start_at'] = (timezone.localtime(plan.start_at)+timedelta(days=7)).strftime('%Y-%m-%dT%H:%M')
        payload['title'] = 'New weekend date'
        response = self.client.post(f'/plans/{plan.pk}/edit/', payload)
        self.assertEqual(response.status_code, 302)
        for task in plan.tasks.all():
            self.assertEqual(task.due_at, original[task.pk] + (timedelta() if task.pk == done.pk else timedelta(days=7)))
        self.assertEqual(plan.tasks.get(pet=self.dog, plan_step='event').title, 'New weekend date')

    def test_cancel_preserves_completed_and_stops_pending(self):
        plan, _ = self.create_plan()
        done = plan.tasks.get(pet=self.dog, plan_step='policy')
        finish_task(done.pk, self.owner, 'completed')
        self.client.post(f'/plans/{plan.pk}/action/', {'action': 'cancel'})
        plan.refresh_from_db()
        self.assertEqual(plan.status, 'cancelled')
        self.assertFalse(plan.tasks.filter(status='pending').exists())
        done.refresh_from_db()
        self.assertEqual(done.status, 'completed')
        call_command('send_reminders', stdout=StringIO())
        self.assertEqual(Notification.objects.count(), 0)

    def test_extra_step_and_event_edit_keep_plan_link(self):
        plan, _ = self.create_plan()
        self.client.post(f'/plans/{plan.pk}/action/', {'action': 'step', 'title': 'Pack favourite bedding', 'due_at': (timezone.localtime()+timedelta(days=39)).strftime('%Y-%m-%dT10:00')})
        self.assertEqual(plan.tasks.filter(title='Pack favourite bedding').count(), 2)
        event = plan.tasks.get(pet=self.dog, plan_step='event')
        self.assertRedirects(self.client.get(f'/tasks/{event.pk}/edit/'), f'/plans/{plan.pk}/edit/')

    def test_multi_lead_reminders_catchup_and_dedup(self):
        start = timezone.now().replace(second=0, microsecond=0)
        task = Task.objects.create(pet=self.dog, title='Café outing', kind='outing', due_at=start+timedelta(days=10), reminder_offsets=[10080,1440,120])
        with patch('care.management.commands.send_reminders.timezone.now', return_value=task.due_at-timedelta(hours=12)):
            call_command('send_reminders', stdout=StringIO())
            call_command('send_reminders', stdout=StringIO())
        self.assertEqual(Notification.objects.count(), 1)
        self.assertTrue(Notification.objects.get().key.endswith(':1440'))
        with patch('care.management.commands.send_reminders.timezone.now', return_value=task.due_at-timedelta(hours=1)):
            call_command('send_reminders', stdout=StringIO())
        self.assertEqual(Notification.objects.count(), 2)

    def test_snooze_does_not_move_event_and_rearms_once(self):
        now = timezone.now()
        task = Task.objects.create(pet=self.dog, title='Training', kind='training', due_at=now+timedelta(minutes=20), reminder_offsets=[30])
        call_command('send_reminders', stdout=StringIO())
        self.client.post(f'/tasks/{task.pk}/action/', {'action': 'snooze'})
        task.refresh_from_db()
        self.assertEqual(task.due_at, now+timedelta(minutes=20))
        call_command('send_reminders', stdout=StringIO())
        self.assertEqual(Notification.objects.count(), 1)
        with patch('care.management.commands.send_reminders.timezone.now', return_value=now+timedelta(hours=2)):
            call_command('send_reminders', stdout=StringIO())
            call_command('send_reminders', stdout=StringIO())
        self.assertEqual(Notification.objects.count(), 2)

    def test_disabled_adventure_reminders_do_not_send(self):
        Preferences.objects.filter(user=self.owner).update(adventure_reminders=False)
        Task.objects.create(pet=self.dog, title='Sport', kind='sport', due_at=timezone.now(), reminder_offsets=[0])
        call_command('send_reminders', stdout=StringIO())
        self.assertFalse(Notification.objects.exists())

    def test_monthly_repeat_retains_day_through_short_month(self):
        task = Task.objects.create(pet=self.dog, title='Monthly training', due_at=datetime(2027,1,31,9,tzinfo=ZoneInfo('Australia/Brisbane')), repeat_rule='monthly', recurrence_day=31)
        finish_task(task.pk, self.owner, 'completed')
        feb = Task.objects.get(status='pending')
        self.assertEqual(timezone.localtime(feb.due_at).day, 28)
        finish_task(feb.pk, self.owner, 'skipped')
        march = Task.objects.get(status='pending')
        self.assertEqual(timezone.localtime(march.due_at).day, 31)

    def test_calendar_previews_do_not_create_records(self):
        Task.objects.create(pet=self.dog, title='Weekly practice', due_at=datetime(2027,1,1,9,tzinfo=ZoneInfo('Australia/Brisbane')), repeat_rule='weekly')
        response = self.client.get('/calendar/?month=2027-01')
        self.assertContains(response, 'Planned repeat')
        self.assertEqual(len(response.context['tasks']), 5)
        self.assertEqual(Task.objects.count(), 1)

    def test_export_includes_plans_and_alarm_offsets(self):
        plan, _ = self.create_plan()
        response = self.client.get('/calendar/export/')
        self.assertContains(response, 'BEGIN:VALARM')
        self.assertContains(response, 'TRIGGER:-PT120M')
        response = self.client.get('/settings/export/')
        with ZipFile(BytesIO(b''.join(response.streaming_content))) as archive:
            data = json.loads(archive.read('your-pet-care.json'))
        self.assertEqual(data['plans'][0]['fields']['pets'], [self.dog.pk,self.cat.pk])

    @patch('care.discovery.fetch_cached')
    def test_outing_import_keeps_source_and_unverified_policy(self, fetch):
        from .discovery import import_nearby
        from .models import Provider
        fetch.return_value = {'elements': [{'type': 'node', 'id': 123,
            'lat': -27.47, 'lon': 153.02,
            'tags': {'name': 'Test dining fixture', 'amenity': 'cafe', 'dog': 'leashed'}}]}
        import_nearby(-27.47, 153.02, outings=True)
        provider = Provider.objects.get(osm_id='node/123')
        self.assertEqual(provider.category, 'cafe')
        self.assertIsNone(provider.verified_at)
        self.assertIn('leashed', provider.pet_policy)
        self.assertEqual(provider.source, 'https://www.openstreetmap.org/node/123')
        self.assertIn(':outings', fetch.call_args.args[1])
        self.assertIn('["dog"~"^(yes|leashed)$"]', fetch.call_args.args[3]['data'])
