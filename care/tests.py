import json
import tempfile
import zipfile
from contextlib import closing
from io import BytesIO
from datetime import timedelta, datetime
from decimal import Decimal
from unittest.mock import patch
from zoneinfo import ZoneInfo
from django.test import TestCase, Client, override_settings
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from .models import Pet, Task, Supply, Timeline, HealthRecord, Preferences, Notification, Provider, ListingRequest, ServiceCache, Audit
from .services import finish_task
from .forms import TaskForm, RecordForm
from .admin import ReviewForm
from .discovery import import_nearby, fetch_cached, DiscoveryError


class CareTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user('owner', 'owner@example.test', 'care-test-password-927')
        cls.other = User.objects.create_user('other', 'other@example.test', 'other-test-password-927')
        Preferences.objects.create(user=cls.owner, reminder_hour=0)
        cls.pet = Pet.objects.create(owner=cls.owner, name='Stormy')
        cls.cat = Pet.objects.create(owner=cls.owner, name='Mochi', species='Cat')
        cls.foreign = Pet.objects.create(owner=cls.other, name='Private pet')
        cls.supply = Supply.objects.create(pet=cls.pet, product='Worming tablets', quantity=1, delivery_days=5, supplier_url='https://www.petbarn.com.au/')
        cls.task = Task.objects.create(pet=cls.pet, title='Worming', kind='worming', due_at=timezone.now()+timedelta(days=7), repeat_days=90, supply=cls.supply, units_used=1)

    def setUp(self):
        self.client.force_login(self.owner)

    def test_all_owner_pages_render(self):
        for path in ['/', '/pets/', f'/pets/{self.pet.pk}/', '/pets/add/', f'/pets/{self.pet.pk}/edit/', '/calendar/', '/supplies/', '/supplies/add/', '/tasks/add/', '/records/add/', '/settings/', '/business/submit/', '/business/requests/', '/find-care/', '/privacy/']:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_guest_browsing_and_private_redirect(self):
        self.client.logout()
        for path in ['/', '/find-care/', '/privacy/', '/accounts/signup/', '/accounts/login/']:
            self.assertEqual(self.client.get(path).status_code, 200)
        self.assertEqual(self.client.get('/pets/').status_code, 302)

    def test_signup_and_optional_pet_profile(self):
        self.client.logout()
        response = self.client.post('/accounts/signup/', {'username': 'newowner', 'email': 'new@example.test', 'password1': 'new-safe-password-837!', 'password2': 'new-safe-password-837!'})
        self.assertRedirects(response, '/pets/add/')
        response = self.client.post('/pets/add/', {'name': 'Pip', 'species': 'Bird'})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Pet.objects.get(name='Pip').owner.username, 'newowner')

    def test_multi_pet_isolation(self):
        response = self.client.get('/pets/')
        self.assertContains(response, 'Stormy')
        self.assertContains(response, 'Mochi')
        self.assertNotContains(response, 'Private pet')
        self.assertEqual(self.client.get(f'/pets/{self.foreign.pk}/').status_code, 404)
        self.assertEqual(self.client.post(f'/pets/{self.foreign.pk}/edit/', {'name': 'Hacked'}).status_code, 404)

    def test_cross_owner_task_and_supply_not_editable(self):
        self.client.force_login(self.other)
        self.assertEqual(self.client.post(f'/tasks/{self.task.pk}/action/', {'action': 'completed'}).status_code, 404)
        self.assertEqual(self.client.post(f'/supplies/{self.supply.pk}/action/', {'action': 'correct', 'quantity': 500}).status_code, 404)
        self.assertEqual(self.client.get(f'/tasks/{self.task.pk}/edit/').status_code, 404)

    def test_cross_pet_supply_rejected(self):
        form = TaskForm({'pet': self.cat.pk, 'title': 'Wrong supply', 'kind': 'other', 'due_at': '2026-10-01T10:00', 'repeat_days': 0, 'reminder_days': 1, 'supply': self.supply.pk, 'units_used': 1}, user=self.owner)
        self.assertFalse(form.is_valid())
        self.assertIn('supply', form.errors)

    def test_stormy_stock_order_receive_complete_journey(self):
        self.assertTrue(self.supply.needs_order)
        self.assertEqual(self.supply.estimate['usage'], Decimal('1'))
        self.client.post(f'/supplies/{self.supply.pk}/action/', {'action': 'ordered'})
        self.supply.refresh_from_db()
        self.assertIsNotNone(self.supply.ordered_at)
        self.assertEqual(self.supply.quantity, 1)
        self.client.post(f'/supplies/{self.supply.pk}/action/', {'action': 'received', 'quantity': 5})
        self.supply.refresh_from_db()
        self.assertIsNone(self.supply.ordered_at)
        self.assertEqual(self.supply.quantity, 5)
        self.client.post(f'/tasks/{self.task.pk}/action/', {'action': 'completed'})
        self.supply.refresh_from_db()
        self.task.refresh_from_db()
        self.assertEqual(self.supply.quantity, 4)
        self.assertEqual(self.task.status, 'completed')
        next_task = Task.objects.get(pet=self.pet, status='pending')
        self.assertEqual(next_task.due_at, self.task.due_at+timedelta(days=90))
        self.assertEqual(Timeline.objects.filter(pet=self.pet).count(), 3)

    def test_duplicate_completion_does_not_consume_twice(self):
        finish_task(self.task.pk, self.owner, 'completed')
        finish_task(self.task.pk, self.owner, 'completed')
        self.supply.refresh_from_db()
        self.assertEqual(self.supply.quantity, 0)
        self.assertEqual(Task.objects.filter(pet=self.pet).count(), 2)

    def test_skip_preserves_stock_and_advances(self):
        finish_task(self.task.pk, self.owner, 'skipped')
        self.supply.refresh_from_db()
        self.assertEqual(self.supply.quantity, 1)
        self.assertEqual(Task.objects.filter(pet=self.pet, status='pending').count(), 1)

    def test_recurring_local_time_across_dst(self):
        prefs = Preferences.objects.get(user=self.owner)
        prefs.timezone = 'Australia/Sydney'
        prefs.save()
        self.task.due_at = datetime(2026, 10, 3, 9, tzinfo=ZoneInfo('Australia/Sydney'))
        self.task.repeat_days = 1
        self.task.save()
        finish_task(self.task.pk, self.owner, 'completed')
        following = Task.objects.get(status='pending', pet=self.pet)
        self.assertEqual(following.due_at.astimezone(ZoneInfo('Australia/Sydney')).hour, 9)
        self.assertEqual((following.due_at-self.task.due_at.astimezone(ZoneInfo('UTC'))).total_seconds(), 23*3600)

    def test_snooze_and_invalid_stock(self):
        self.client.post(f'/supplies/{self.supply.pk}/action/', {'action': 'snooze'})
        self.supply.refresh_from_db()
        self.assertFalse(self.supply.needs_order)
        for bad in ['-1', 'NaN', 'Infinity', 'abc', '1.234']:
            self.client.post(f'/supplies/{self.supply.pk}/action/', {'action': 'correct', 'quantity': bad})
            self.supply.refresh_from_db()
            self.assertEqual(self.supply.quantity, 1)

    def test_appointment_provider_followup(self):
        provider = Provider.objects.create(name='Test fixture only', category='vet', lat=-27.4, lon=153, address='Test address')
        due = timezone.now()+timedelta(days=2)
        task = Task.objects.create(pet=self.pet, title='Assessment', provider=provider, due_at=due, follow_up_at=due+timedelta(days=7), notes='Owner notes', cost=75)
        self.assertContains(self.client.get(f'/providers/{provider.pk}/'), 'Get directions')
        finish_task(task.pk, self.owner, 'completed')
        followup = Task.objects.get(title='Follow up: Assessment')
        self.assertEqual(followup.provider, provider)
        self.assertEqual(followup.pet, self.pet)

    def test_calendar_export_owner_only_and_escaped(self):
        Task.objects.create(pet=self.foreign, title='Secret', due_at=timezone.now())
        self.task.title = 'Care, notes;\nNew line'
        self.task.save()
        response = self.client.get('/calendar/export/')
        self.assertContains(response, 'BEGIN:VCALENDAR')
        self.assertContains(response, 'Care\\, notes\\;\\nNew line')
        self.assertNotContains(response, 'Secret')

    def test_reminder_generation_deduplicates(self):
        self.task.due_at = timezone.now()+timedelta(days=6)
        self.task.save()
        call_command('send_reminders')
        count = Notification.objects.count()
        self.assertGreater(count, 0)
        call_command('send_reminders')
        self.assertEqual(Notification.objects.count(), count)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend')
    @patch('care.management.commands.send_reminders.send_mail')
    def test_email_claim_prevents_duplicates_and_logs_uncertainty(self, send):
        prefs = Preferences.objects.get(user=self.owner)
        prefs.email_reminders = True
        prefs.supply_reminders = False
        prefs.save()
        self.task.due_at = timezone.now()
        self.task.save()
        send.side_effect = TimeoutError()
        call_command('send_reminders')
        call_command('send_reminders')
        self.assertEqual(send.call_count, 1)
        self.assertEqual(Notification.objects.get().status, 'uncertain')

    def test_private_documents_and_export(self):
        with tempfile.TemporaryDirectory() as folder, override_settings(MEDIA_ROOT=folder):
            record = HealthRecord.objects.create(pet=self.pet, title='Certificate', kind='document', document=SimpleUploadedFile('certificate.pdf', b'%PDF-1.4 test'))
            response = self.client.get(f'/files/document/{record.pk}/')
            self.assertEqual(response.status_code, 200)
            self.assertIn('attachment', response['Content-Disposition'])
            response.close()
            self.client.force_login(self.other)
            self.assertEqual(self.client.get(f'/files/document/{record.pk}/').status_code, 404)
            self.client.force_login(self.owner)
            response = self.client.get('/settings/export/')
            archive = zipfile.ZipFile(BytesIO(b''.join(response.streaming_content)))
            exported = json.loads(archive.read('your-pet-care.json'))
            self.assertEqual(len(exported['pets']), 2)
            self.assertTrue(any(name.endswith('.pdf') for name in archive.namelist()))

    def test_document_content_validation(self):
        form = RecordForm({'pet': self.pet.pk, 'kind': 'document', 'title': 'Bad file', 'recorded_at': '2026-09-26T09:00'}, {'document': SimpleUploadedFile('bad.pdf', b'<script>alert(1)</script>', content_type='application/pdf')}, user=self.owner)
        self.assertFalse(form.is_valid())
        self.assertIn('document', form.errors)

    def test_delete_requires_password_and_cascades(self):
        audit = Audit.objects.create(actor=self.owner, action='Public provider details corrected')
        self.client.post('/settings/delete/', {'confirm': 'DELETE', 'password': 'wrong'})
        self.assertTrue(User.objects.filter(pk=self.owner.pk).exists())
        self.client.post('/settings/delete/', {'confirm': 'DELETE', 'password': 'care-test-password-927'})
        self.assertFalse(User.objects.filter(pk=self.owner.pk).exists())
        self.assertFalse(Pet.objects.filter(pk=self.pet.pk).exists())
        self.assertTrue(Pet.objects.filter(pk=self.foreign.pk).exists())
        audit.refresh_from_db()
        self.assertIsNone(audit.actor)

    def test_csrf_required_for_mutation(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.owner)
        self.assertEqual(client.post(f'/tasks/{self.task.pk}/action/', {'action': 'completed'}).status_code, 403)
        self.assertEqual(client.get(f'/tasks/{self.task.pk}/action/').status_code, 405)

    @patch('care.discovery.fetch_cached')
    def test_osm_import_sanitises_links_and_does_not_assert_emergency(self, fetch):
        fetch.return_value = {'elements': [{'type': 'node', 'id': 123, 'lat': -27.4, 'lon': 153, 'tags': {'name': 'Test OSM fixture', 'amenity': 'veterinary', 'website': 'javascript:alert(1)', 'emergency': 'yes'}}]}
        import_nearby(-27.4, 153)
        provider = Provider.objects.get(osm_id='node/123')
        self.assertEqual(provider.website, '')
        self.assertIsNone(provider.emergency_verified_at)
        self.assertEqual(provider.source, 'https://www.openstreetmap.org/node/123')

    @patch('care.discovery.requests.request')
    def test_service_caching_and_throttle(self, request):
        request.return_value.json.return_value = [{'lat': '-27', 'lon': '153'}]
        fetch_cached('geocode', 'brisbane', 'https://example.test', {}, 60)
        fetch_cached('geocode', 'brisbane', 'https://example.test', {}, 60)
        self.assertEqual(request.call_count, 1)
        with self.assertRaises(DiscoveryError):
            fetch_cached('geocode', 'other', 'https://example.test', {}, 60)

    @patch('care.discovery.geocode', side_effect=DiscoveryError('Search unavailable'))
    def test_discovery_outage_is_friendly(self, geocode):
        self.assertContains(self.client.get('/find-care/?q=Brisbane'), 'Search unavailable')

    def test_listing_claim_is_pending_and_requires_review_evidence(self):
        provider = Provider.objects.create(name='Test fixture', category='vet', lat=-27.4, lon=153)
        self.client.post('/business/submit/', {'kind': 'claim', 'provider': provider.pk, 'business_name': 'Test fixture', 'contact_email': 'owner@example.test', 'details': 'Ownership evidence for review'})
        claim = ListingRequest.objects.get()
        self.assertEqual(claim.status, 'pending')
        form = ReviewForm({'kind': 'claim', 'business_name': 'Test', 'contact_email': 'a@example.test', 'details': 'Evidence', 'status': 'approved', 'provider': provider.pk}, instance=claim)
        self.assertFalse(form.is_valid())
        self.assertEqual(self.client.get('/admin/').status_code, 302)

    def test_untrusted_location_input_is_handled(self):
        self.assertContains(self.client.get('/find-care/?lat=nan&lon=153'), 'Enter a valid Australian location.')

    def test_followup_record_edits_update_one_task(self):
        payload = {'pet': self.pet.pk, 'kind': 'visit', 'title': 'Assessment notes', 'recorded_at': '2026-09-26T09:00', 'follow_up_at': '2026-10-02T09:00'}
        self.client.post('/records/add/', payload)
        record = HealthRecord.objects.get(title='Assessment notes')
        self.assertEqual(Task.objects.filter(source_record=record).count(), 1)
        payload['follow_up_at'] = '2026-10-03T10:00'
        self.client.post(f'/records/{record.pk}/edit/', payload)
        self.assertEqual(Task.objects.filter(source_record=record).count(), 1)
        self.assertEqual(timezone.localtime(Task.objects.get(source_record=record).due_at).day, 3)

    def test_authentication_throttle(self):
        self.client.logout()
        key = 'auth-rate:' + __import__('hashlib').sha256(b'127.0.0.1').hexdigest()
        ServiceCache.objects.create(key=key, data={'count': 20}, expires_at=timezone.now()+timedelta(minutes=15))
        self.assertEqual(self.client.post('/accounts/login/', {'username': 'owner', 'password': 'wrong'}).status_code, 429)

    def test_backup_archive_integrity(self):
        import sqlite3
        from pathlib import Path
        from io import StringIO
        # The test database is in-memory; back up a real temporary database fixture.
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder)/'source.sqlite3'
            with closing(sqlite3.connect(source)) as db, db:
                db.execute('CREATE TABLE check_restore (value TEXT)')
                db.execute("INSERT INTO check_restore VALUES ('restored')")
            with override_settings(DATABASES={'default': {'NAME': source}}, MEDIA_ROOT=Path(folder)/'media'):
                call_command('backup', output=folder, stdout=StringIO())
            with zipfile.ZipFile(next(Path(folder).glob('your-pet-care-*.zip'))) as archive:
                restored = Path(folder)/'restored.sqlite3'
                restored.write_bytes(archive.read('db.sqlite3'))
            with closing(sqlite3.connect(restored)) as db:
                self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
                self.assertEqual(db.execute('SELECT value FROM check_restore').fetchone()[0], 'restored')
