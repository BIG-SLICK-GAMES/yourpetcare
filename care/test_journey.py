import uuid
from datetime import timedelta
from django.test import TestCase, Client, override_settings
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Pet, Task, LifePlan, ListingRequest, Preferences


@override_settings(LOCAL_PREVIEW=True)
class JourneyTests(TestCase):
    def test_local_preview_is_open_and_isolated(self):
        response = self.client.get('/')
        self.assertContains(response, 'No sign-up needed')
        owner = response.wsgi_request.user
        self.assertFalse(owner.has_usable_password())
        self.assertFalse(owner.is_staff)
        pet = Pet.objects.create(owner=owner, name='Private companion')
        other = Client()
        self.assertEqual(other.get('/calendar/').status_code,200)
        self.assertEqual(other.get(f'/pets/{pet.pk}/').status_code,404)
        self.assertNotEqual(other.session['_auth_user_id'], str(owner.pk))
        self.assertEqual(self.client.get('/calendar/').status_code,200)
        self.assertEqual(self.client.session['_auth_user_id'],str(owner.pk))
        self.assertEqual(self.client.get('/calendar/', REMOTE_ADDR='203.0.113.2').status_code,302)

    def test_preview_not_enabled_for_remote_or_admin(self):
        self.assertEqual(self.client.get('/pets/',REMOTE_ADDR='203.0.113.2').status_code,302)
        self.assertEqual(User.objects.count(),0)
        self.client.get('/admin/login/')
        self.assertEqual(User.objects.count(),0)

    @override_settings(LOCAL_PREVIEW=False)
    def test_preview_disabled_preserves_private_routes(self):
        self.assertEqual(self.client.get('/calendar/').status_code,302)
        self.assertEqual(self.client.get('/community/giving/').status_code,200)
        self.assertEqual(User.objects.count(),0)

    def meet_pet(self):
        self.client.get('/journey/')
        answers = {'name':'Pip','species':'Cat','age':'Senior','training':'starting','feeling':'quiet','wish':['enrichment']}
        for step,answer in answers.items():
            response=self.client.post('/journey/?step='+step,{'answer':answer})
            self.assertEqual(response.status_code,302,step)
        return Pet.objects.get(name='Pip')

    def test_conversation_preserves_answers_and_species(self):
        pet=self.meet_pet()
        self.assertEqual(pet.species,'Cat')
        self.assertEqual(pet.social_comfort,'quiet')
        response=self.client.get('/journey/?step=age')
        self.assertEqual(response.context['form']['answer'].value(),'Senior')
        ready=self.client.get('/journey/ideas/')
        self.assertEqual(len(ready.context['ideas']),3)
        self.assertTrue(all(i['key'] not in ['agility','scent','cafe'] for i in ready.context['ideas']))
        self.client.post('/journey/?step=wish',{'answer':['enrichment']})
        self.assertEqual(Pet.objects.count(),1)

    def test_skip_optional_and_invalid_answer(self):
        self.client.post('/journey/',{'answer':'Sunny'})
        self.assertEqual(self.client.post('/journey/?step=species',{'answer':'invalid'}).status_code,200)
        for step in ['species','age','training','feeling','wish']:
            self.client.post('/journey/?step='+step,{'skip':'yes'})
        pet=Pet.objects.get(name='Sunny')
        self.assertEqual(pet.species,'Other')
        self.assertEqual(pet.interests,[])

    def test_quick_plan_no_prep_by_default_and_deduplicated(self):
        pet=self.meet_pet()
        payload={'day':str(timezone.localdate()+timedelta(days=10)),'time':'10:00','token':str(uuid.uuid4())}
        path=f'/journey/plan/enrichment/?pet={pet.pk}'
        self.assertContains(self.client.post(path,payload),'It’s a date, Pip.')
        self.client.post(path,payload)
        self.assertEqual(LifePlan.objects.count(),1)
        self.assertEqual(Task.objects.count(),1)
        self.assertEqual(Task.objects.get().reminder_offsets,[1440,120])
        payload['day']=str(timezone.localdate()-timedelta(days=2))
        self.assertContains(self.client.post(path,payload),'choose a time still ahead')
        self.assertEqual(self.client.get(f'/journey/plan/cafe/?pet={pet.pk}').status_code,404)

    def test_service_submission_is_private_review_only(self):
        response=self.client.get('/services/add/')
        payload={'service':'walking','name':'Test Walks','area':'North Lakes','about':'Gentle walks with small groups.','email':'walks@example.test','consent':'on','token':response.context['form']['token'].value()}
        result=self.client.post('/services/add/',payload)
        self.assertEqual(result.status_code,302)
        self.client.post('/services/add/',payload)
        listing=ListingRequest.objects.get()
        self.assertEqual(listing.status,'pending')
        self.assertIn('Dog walking',listing.details)
        self.assertNotContains(self.client.get('/community/help/'),'Test Walks')
        self.assertEqual(Client().get(f'/services/thanks/{listing.pk}/').status_code,404)

    def test_reset_requires_confirmation_and_only_deletes_own_preview(self):
        pet=self.meet_pet()
        owner=pet.owner_id
        regular=User.objects.create_user('regular',password='regular-pass-192!')
        self.client.post('/preview/reset/',{})
        self.assertTrue(Pet.objects.filter(pk=pet.pk).exists())
        self.client.post('/preview/reset/',{'confirm':'yes'})
        self.assertFalse(User.objects.filter(pk=owner).exists())
        self.assertTrue(User.objects.filter(pk=regular.pk).exists())
        self.client.force_login(regular)
        self.assertEqual(self.client.post('/preview/reset/',{'confirm':'yes'}).status_code,404)

    def test_community_sources_and_categories(self):
        for path in ['/community/','/community/rescue/','/community/giving/','/community/help/','/community/farewell/']:
            self.assertEqual(self.client.get(path).status_code,200)
        self.assertContains(self.client.get('/community/giving/'),'https://www.deltasociety.com.au/volunteer')
        self.assertContains(self.client.get('/community/farewell/'),'Pets in Peace')
        self.assertEqual(self.client.get('/community/invalid/').status_code,404)
