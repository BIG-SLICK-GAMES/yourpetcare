from django.test import TestCase, override_settings, Client
from .menu import grouped_menu


class MenuTests(TestCase):
    def test_groups_and_health_search(self):
        groups, _ = grouped_menu()
        self.assertEqual(len(groups),5)
        self.assertEqual(sum(len(g['items']) for g in groups),28)
        groups, _ = grouped_menu('worming','fun')
        self.assertEqual(groups[0]['slug'],'healthy')
        self.assertIn('worming',[i['key'] for i in groups[0]['items']])
        groups, _ = grouped_menu('dinner')
        self.assertEqual(groups[0]['slug'],'out')
        self.assertEqual(groups[0]['items'][0]['key'],'cafe')

    def test_categories_empty_search_and_typo(self):
        groups, _ = grouped_menu(category='fun')
        self.assertEqual([g['slug'] for g in groups],['fun'])
        groups, suggestion = grouped_menu('wormimg')
        self.assertEqual(groups,[])
        self.assertEqual(suggestion,'worming')
        self.assertContains(self.client.get('/?q=unfindablething'),'Let’s try another way')
        self.assertContains(self.client.get('/?category=fun'),'Fun Together')

    @override_settings(LOCAL_PREVIEW=True, PREVIEW_NETWORKS=['192.168.0.0/24'])
    def test_phone_preview_keeps_owners_separate_and_prefills_care(self):
        first=Client(REMOTE_ADDR='192.168.0.20')
        self.assertEqual(first.get('/').status_code,200)
        second=Client(REMOTE_ADDR='192.168.0.21')
        second.get('/')
        self.assertNotEqual(first.session['_auth_user_id'],second.session['_auth_user_id'])
        self.assertEqual(first.get('/tasks/add/?kind=worming').context['form']['kind'].value(),'worming')
        external=Client(REMOTE_ADDR='203.0.113.2')
        self.assertEqual(external.get('/calendar/').status_code,302)
