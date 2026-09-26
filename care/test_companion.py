import json
from datetime import timedelta
from unittest.mock import patch, Mock
import requests
from django.test import TestCase, override_settings, Client
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Pet, Task, LifePlan, Supply, Provider, SavedProvider, CompanionProposal
from .ideas import suggestions


@override_settings(LOCAL_PREVIEW=False, PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class CompanionTests(TestCase):
    def setUp(self):
        self.owner=User.objects.create_user('companion-owner',password='testing')
        self.other=User.objects.create_user('companion-other',password='testing')
        self.pet=Pet.objects.create(owner=self.owner,name='Pip',species='Dog')
        self.foreign=Pet.objects.create(owner=self.other,name='Private')
        self.client.force_login(self.owner)

    def propose(self, payload):
        response=self.client.post(f'/companion/pets/{self.pet.pk}/propose/',payload)
        self.assertEqual(response.status_code,302)
        return CompanionProposal.objects.latest('created_at')

    def decide(self,p,decision='confirm'):
        return self.client.post(f'/companion/proposals/{p.pk}/decide/',{'decision':decision})

    def test_preference_is_only_written_after_confirmation(self):
        p=self.propose({'action':'preference','field':'social_comfort','value':'quiet'})
        self.pet.refresh_from_db();self.assertEqual(self.pet.social_comfort,'')
        self.assertContains(self.client.get(f'/companion/proposals/{p.pk}/'),'Confirm')
        self.decide(p);self.pet.refresh_from_db();self.assertEqual(self.pet.social_comfort,'quiet')
        self.decide(p);self.assertEqual(self.pet.timeline.filter(title='Companion change confirmed').count(),1)

    def test_change_invalidates_old_choice_and_cancel_does_not_write(self):
        p=self.propose({'action':'preference','field':'social_comfort','value':'quiet'})
        response=self.client.post(f'/companion/proposals/{p.pk}/change/',{'action':'preference','field':'social_comfort','value':'social'})
        self.assertEqual(response.status_code,302)
        new=CompanionProposal.objects.latest('created_at')
        p.refresh_from_db();self.assertEqual(p.status,'cancelled')
        self.decide(p);self.decide(new,'cancel');self.decide(new)
        self.pet.refresh_from_db();self.assertEqual(self.pet.social_comfort,'')

    def test_stale_and_expired_preferences_cannot_overwrite(self):
        p=self.propose({'action':'preference','field':'social_comfort','value':'quiet'})
        self.pet.social_comfort='building';self.pet.save()
        self.decide(p);self.pet.refresh_from_db();self.assertEqual(self.pet.social_comfort,'building')
        p.expires_at=timezone.now()-timedelta(seconds=1);p.save()
        self.decide(p);p.refresh_from_db();self.assertEqual(p.status,'expired')

    def test_plan_uses_existing_calendar_and_is_idempotent(self):
        payload={'action':'plan','idea_key':suggestions(self.pet)[0]['key'],'start_at':(timezone.now()+timedelta(days=2)).isoformat(),'minutes':10,'location':'Local park'}
        p=self.propose(payload)
        self.assertFalse(Task.objects.exists());self.assertFalse(LifePlan.objects.exists())
        self.decide(p);self.decide(p)
        self.assertEqual(Task.objects.count(),1);self.assertEqual(LifePlan.objects.count(),1)
        task=Task.objects.get();self.assertEqual(task.plan.pets.get(),self.pet)
        self.assertEqual(task.reminder_offsets,[1440,120])
        self.assertContains(self.client.get('/calendar/'),task.title)

    def test_completion_preserves_stock_and_recurrence(self):
        stock=Supply.objects.create(pet=self.pet,product='Food',quantity=5)
        task=Task.objects.create(pet=self.pet,title='Feed',due_at=timezone.now(),supply=stock,units_used=1,repeat_days=1)
        p=self.propose({'action':'complete_task','target_id':task.pk})
        stock.refresh_from_db();self.assertEqual(stock.quantity,5)
        self.decide(p);self.decide(p);stock.refresh_from_db();task.refresh_from_db()
        self.assertEqual(stock.quantity,4);self.assertEqual(task.status,'completed')
        self.assertEqual(Task.objects.filter(status='pending').count(),1)

    def test_changed_followup_blocks_old_completion(self):
        task=Task.objects.create(pet=self.pet,title='Care',due_at=timezone.now())
        p=self.propose({'action':'complete_task','target_id':task.pk})
        task.follow_up_at=timezone.now()+timedelta(days=1);task.save()
        self.decide(p);task.refresh_from_db();self.assertEqual(task.status,'pending')

    def test_owner_boundaries_and_post_csrf(self):
        p=self.propose({'action':'preference','field':'social_comfort','value':'quiet'})
        self.assertEqual(self.client.get(f'/companion/proposals/{p.pk}/decide/').status_code,405)
        protected=Client(enforce_csrf_checks=True);protected.force_login(self.owner)
        self.assertEqual(protected.post(f'/companion/proposals/{p.pk}/decide/',{'decision':'confirm'}).status_code,403)
        self.client.force_login(self.other)
        for suffix in ['', 'change/', 'decide/']:
            self.assertEqual(self.client.post(f'/companion/proposals/{p.pk}/{suffix}',{'decision':'confirm'}).status_code,404)
        self.assertEqual(self.client.get(f'/companion/?pet={self.pet.pk}').status_code,404)

    def test_private_task_and_invalid_preference_rejected(self):
        task=Task.objects.create(pet=self.foreign,title='Private',due_at=timezone.now())
        for payload in [{'action':'complete_task','target_id':task.pk},{'action':'preference','field':'owner','value':self.other.pk}]:
            self.assertEqual(self.client.post(f'/companion/pets/{self.pet.pk}/propose/',payload).status_code,200)
        self.assertFalse(CompanionProposal.objects.exists())

    def test_directory_service_saved_only_after_review(self):
        provider=Provider.objects.create(name='Park',category='park',lat=-27.4,lon=153.0)
        self.assertContains(self.client.get(f'/companion/?provider={provider.pk}'),'Review saving service')
        p=self.propose({'action':'save_service','target_id':provider.pk})
        self.assertFalse(SavedProvider.objects.exists())
        self.decide(p);self.decide(p);self.assertEqual(SavedProvider.objects.get().provider,provider)

    @override_settings(COMPANION_API_KEY='test-only-key')
    @patch('care.companion.requests.post')
    def test_api_requires_opt_in_and_only_stages(self, post):
        response=Mock();response.json.return_value={'output':[{'type':'function_call','name':'offer_next_step','arguments':json.dumps({'reply':'Review this preference.','action':'preference','field':'social_comfort','value':'quiet'})}]};post.return_value=response
        self.client.get('/companion/');self.client.post('/companion/',{'message':'Pip is shy'})
        post.assert_not_called()
        self.assertContains(self.client.post('/companion/',{'message':'Remember quiet places','use_ai':'yes'}),'Review choice')
        self.pet.refresh_from_db();self.assertEqual(self.pet.social_comfort,'')
        self.assertEqual(CompanionProposal.objects.count(),1)
        self.assertFalse(post.call_args.kwargs['json']['store'])

    @override_settings(COMPANION_API_KEY='test-only-key')
    @patch('care.companion.requests.post')
    def test_api_failure_and_invented_target_make_no_changes(self, post):
        post.side_effect=requests.Timeout()
        self.assertContains(self.client.post('/companion/',{'message':'Hello','use_ai':'yes'}),'AI could not respond')
        post.side_effect=None
        response=Mock();response.json.return_value={'output':[{'type':'function_call','name':'offer_next_step','arguments':json.dumps({'reply':'Done','action':'complete_task','target_id':999})}]};post.return_value=response
        self.assertContains(self.client.post('/companion/',{'message':'Done','use_ai':'yes'}),'AI could not respond')
        self.assertFalse(CompanionProposal.objects.exists())

    def test_history_is_separate_and_clearable(self):
        second=Pet.objects.create(owner=self.owner,name='Bird',species='Bird')
        self.client.post(f'/companion/?pet={self.pet.pk}',{'message':'A special private message'})
        self.assertNotContains(self.client.get(f'/companion/?pet={second.pk}'),'A special private message')
        self.client.post(f'/companion/?pet={self.pet.pk}',{'clear':'yes'})
        self.assertNotContains(self.client.get(f'/companion/?pet={self.pet.pk}'),'A special private message')
