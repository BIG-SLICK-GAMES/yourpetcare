from unittest.mock import patch
from django.test import TestCase, override_settings
from .models import Pet, Provider
from .ideas import suggestions


@override_settings(LOCAL_PREVIEW=True)
class MapAnimalTests(TestCase):
    def setUp(self):
        for name, animals in [('Equine care', ['Horse']), ('Avian care', ['Bird']), ('Unknown care', [])]:
            Provider.objects.create(name=name, species_supported=animals, category='vet', lat=-27.47, lon=153.025)

    def test_animal_filter_distinguishes_unknown_and_recorded(self):
        response = self.client.get('/find-care/?species=Horse')
        self.assertEqual({p.name for p in response.context['providers']}, {'Equine care', 'Unknown care'})
        response = self.client.get('/find-care/?species=Horse&known=1')
        self.assertEqual([p.name for p in response.context['providers']], ['Equine care'])
        self.assertContains(response, 'Animals recorded: Horse')
        self.assertContains(self.client.get('/find-care/?species=Reptile&known=1'), 'No matching listings here yet')

    @patch('care.discovery.import_nearby')
    @patch('care.discovery.geocode', return_value=(-27.47, 153.025))
    def test_new_suburb_overrides_previous_map_center(self, geocode, nearby):
        response = self.client.get('/find-care/', {'q':'Brisbane', 'lat':-28, 'lon':152, 'species':'Horse', 'service_search':'equine', 'zoom':14})
        nearby.assert_called_once_with(-27.47, 153.025, outings=False)
        self.assertEqual(response.context['zoom'], 14)
        self.assertEqual([p.name for p in response.context['providers']], ['Equine care'])

    def test_invalid_map_coordinates_are_recoverable(self):
        response = self.client.get('/find-care/?lat=nan&lon=153&zoom=broken')
        self.assertContains(response, 'Enter a valid Australian location.')
        self.assertEqual(response.context['zoom'], 12)

    def test_reptile_conversation_and_relevant_ideas(self):
        from django.contrib.auth.models import User
        self.client.force_login(User.objects.create_user('reptile-owner', password='Test-only-193!'))
        self.client.post('/journey/', {'answer':'Fern'})
        self.client.post('/journey/?step=species', {'answer':'Reptile', 'species_detail':'Bearded dragon'})
        for step in ['age','training','feeling','wish']:
            self.client.post('/journey/?step='+step, {'skip':'yes'})
        pet = Pet.objects.get(name='Fern')
        self.assertEqual(pet.species_detail, 'Bearded dragon')
        ideas = suggestions(pet)
        self.assertEqual(ideas[0]['key'], 'habitat-time')
        self.assertFalse({'agility','cafe','flight'} & {i['key'] for i in ideas})
        pet.species = 'Horse'
        self.assertEqual(suggestions(pet)[0]['key'], 'horse-time')
