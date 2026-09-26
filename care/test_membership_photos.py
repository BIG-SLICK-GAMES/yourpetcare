import json
import tempfile
from io import BytesIO
from PIL import Image
from django.test import TestCase, Client, override_settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Pet, Provider, SavedProvider, Audit


def photo(name='companion.png'):
    stream = BytesIO()
    Image.new('RGB', (30,30), '#dcb690').save(stream, 'PNG')
    return SimpleUploadedFile(name, stream.getvalue(), content_type='image/png')


@override_settings(LOCAL_PREVIEW=True)
class MembershipTests(TestCase):
    def test_browsing_open_but_saving_requires_account(self):
        self.assertEqual(self.client.get('/find-care/').status_code, 200)
        for path in ['/pets/add/', '/services/add/', '/tasks/add/', '/pets/1/photo/']:
            self.assertIn('/accounts/signup/', self.client.get(path).url)
        self.client.post('/pets/add/', {'name':'Not saved', 'species':'Dog'})
        self.assertEqual(Pet.objects.count(), 0)

    def test_signup_upgrades_preview_without_losing_draft_or_records(self):
        self.client.get('/')
        owner_id = self.client.session['_auth_user_id']
        old = Pet.objects.create(owner_id=owner_id, name='Existing companion')
        self.client.post('/journey/', {'answer':'Kiwi'})
        self.client.post('/journey/?step=species', {'answer':'Bird','species_detail':'Cockatiel'})
        for step in ['age','training','feeling']:
            self.client.post('/journey/?step='+step, {'skip':'yes'})
        response=self.client.post('/journey/?step=wish', {'answer':['enrichment']})
        self.assertIn('/accounts/signup/', response.url)
        self.assertEqual(Pet.objects.count(), 1)
        payload={'username':'kiwi-family', 'email':'kiwi@example.test', 'password1':'Bird-family-safe-918!', 'password2':'Bird-family-safe-918!', 'next':'/journey/?step=wish'}
        self.assertRedirects(self.client.post('/accounts/signup/',payload), '/journey/?step=wish')
        self.assertEqual(self.client.session['_auth_user_id'], owner_id)
        self.assertNotIn('local_preview', self.client.session)
        self.assertEqual(self.client.session['pet_conversation']['species_detail'], 'Cockatiel')
        self.client.post('/journey/?step=wish', {'answer':['enrichment']})
        self.assertTrue(Pet.objects.filter(name='Kiwi', owner_id=owner_id).exists())
        old.refresh_from_db()
        self.assertEqual(str(old.owner_id), owner_id)
        other=Client()
        other.post('/accounts/login/', {'username':'kiwi-family','password':'Bird-family-safe-918!'})
        self.assertContains(other.get('/pets/'), 'Kiwi')

    def test_cookie_choices_independent_of_membership_and_safe_redirect(self):
        self.client.get('/')
        self.assertRedirects(self.client.post('/cookies/', {'choice':'essential','next':'https://outside.example/'}), '/')
        self.assertFalse(self.client.get('/').context['cookie_choices']['advertising'])
        self.client.post('/cookies/', {'choice':'all'})
        self.assertTrue(self.client.get('/').context['cookie_choices']['advertising'])
        self.client.post('/cookies/', {'choice':'custom'})
        self.assertFalse(self.client.get('/').context['cookie_choices']['advertising'])
        self.client.cookies['ypc_cookie_choices']='tampered'
        self.assertContains(self.client.get('/'), 'Accept all cookies')
        self.assertEqual(self.client.post('/cookies/', {'choice':'invalid'}).status_code,400)

    def test_cookie_endpoint_requires_csrf(self):
        client=Client(enforce_csrf_checks=True)
        self.assertEqual(client.post('/cookies/', {'choice':'all'}).status_code,403)

    def test_saved_services_private_idempotent_and_available_with_essential_only(self):
        provider=Provider.objects.create(name='Source listing',category='vet',lat=-27.47,lon=153.025)
        path=f'/providers/{provider.pk}/save/'
        self.assertIn('/accounts/signup/',self.client.post(path).url)
        owner=User.objects.create_user('owner',password='Testing-only-824!')
        self.client.force_login(owner)
        self.client.post('/cookies/', {'choice':'essential'})
        self.client.post(path)
        self.client.post(path)
        self.assertEqual(SavedProvider.objects.count(),1)
        self.assertContains(self.client.get('/services/saved/'),'Source listing')
        other=Client()
        other.force_login(User.objects.create_user('other',password='Testing-only-825!'))
        self.assertNotContains(other.get('/services/saved/'),'Source listing')
        other.post(path, {'action':'remove'})
        self.assertEqual(SavedProvider.objects.count(),1)
        self.client.post(path, {'action':'remove'})
        self.assertEqual(SavedProvider.objects.count(),0)


class PhotoReviewTests(TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory()
        self.media=override_settings(MEDIA_ROOT=self.folder.name)
        self.media.enable()
        self.addCleanup(self.folder.cleanup)
        self.addCleanup(self.media.disable)
        self.owner=User.objects.create_user('photo-owner',password='Photo-test-739!')
        self.client.force_login(self.owner)
        self.pet=Pet.objects.create(owner=self.owner,name='Mango',species='Bird')

    def test_upload_pending_admin_approval_and_replacement_resets_review(self):
        path=f'/pets/{self.pet.pk}/photo/'
        self.assertRedirects(self.client.post(path, {'photo':photo(),'photo_status':'approved'}), '/pets/')
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.photo_status,'pending')
        self.assertNotContains(self.client.get('/pets/'),f'src="/files/photo/{self.pet.pk}/"')
        admin=User.objects.create_superuser('reviewer','review@example.test','Review-only-937!')
        desk=Client()
        desk.force_login(admin)
        image_response=desk.get(f'/admin/care/pet/{self.pet.pk}/review-photo/')
        self.assertEqual(image_response.status_code,200)
        image_response.close()
        response=desk.post(f'/admin/care/pet/{self.pet.pk}/change/', {'photo_status':'approved','photo_review_note':'Pet photo checked','photo_revision':self.pet.photo.name,'_save':'Save'})
        self.assertEqual(response.status_code,302)
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.photo_status,'approved')
        self.assertIsNotNone(self.pet.photo_reviewed_at)
        self.assertTrue(Audit.objects.filter(action=f'Pet photo {self.pet.pk}: approved').exists())
        self.assertContains(self.client.get('/pets/'),f'src="/files/photo/{self.pet.pk}/"')
        self.client.post(path, {'photo':photo('replacement.png')})
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.photo_status,'pending')
        self.assertEqual(self.pet.photo_review_note,'')
        self.assertIsNone(self.pet.photo_reviewed_at)

    def test_private_photo_and_upload_permissions_and_invalid_file(self):
        self.pet.photo=photo()
        self.pet.save()
        other=Client()
        other.force_login(User.objects.create_user('not-owner',password='Testing-937!'))
        self.assertEqual(other.get(f'/files/photo/{self.pet.pk}/').status_code,404)
        self.assertEqual(other.post(f'/pets/{self.pet.pk}/photo/', {'photo':photo()}).status_code,404)
        self.assertEqual(other.get(f'/admin/care/pet/{self.pet.pk}/review-photo/').status_code,302)
        bad=SimpleUploadedFile('bad.png',b'not an image',content_type='image/png')
        self.assertContains(self.client.post(f'/pets/{self.pet.pk}/photo/', {'photo':bad}), 'Upload a valid image')

    def test_picture_library_search_selection_and_invalid_key(self):
        path=f'/pets/{self.pet.pk}/picture/'
        response=self.client.get(path, {'q':'bearded dragon'})
        self.assertContains(response,'Use Lizard picture')
        self.assertNotContains(response,'Use Dog picture')
        self.assertContains(self.client.get(path, {'q':'not-a-pet'}),'No matching pictures')
        self.assertEqual(self.client.post(path, {'picture':'../../outside'}).status_code,400)
        self.client.post(path, {'picture':'bird'})
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.avatar_key,'bird')
        self.assertFalse(self.pet.photo)
        self.assertContains(self.client.get('/pets/'),'pet-pictures/bird.svg')
        self.client.post(f'/pets/{self.pet.pk}/photo/', {'photo':photo()})
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.avatar_key,'')

    def test_replaced_photo_cannot_be_approved_from_stale_review(self):
        from .admin import PetPhotoReviewForm
        self.pet.photo=photo('first.png')
        self.pet.save()
        original=self.pet.photo.name
        self.pet.photo=photo('second.png')
        self.pet.save()
        form=PetPhotoReviewForm({'photo_status':'approved','photo_review_note':'Old image','photo_revision':original},instance=self.pet)
        self.assertFalse(form.is_valid())
        self.assertIn('replaced',str(form.non_field_errors()))
