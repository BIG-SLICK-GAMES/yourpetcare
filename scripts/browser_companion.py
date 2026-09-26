"""Local confirmation journey with a disposable owner; no real AI calls."""
import os
import sys
import uuid
from pathlib import Path
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
from django.contrib.auth.models import User
from django.utils import timezone
from care.models import Pet, Task, LifePlan, Provider, SavedProvider

def db(call):
    with ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(call).result()

def axe(page):
    page.add_script_tag(path=str(root/'artifacts/axe.min.js'))
    problems=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
    assert not problems,problems

username='companion_qa_'+uuid.uuid4().hex[:10]
password=uuid.uuid4().hex+'-Qa!'
owner=User.objects.create_user(username,password=password)
pet=Pet.objects.create(owner=owner,name='Pip',species='Dog')
provider=Provider.objects.first()
base='http://192.168.0.109:8000'
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch()
        page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base+'/accounts/login/')
        page.get_by_role('button',name='Essential only',exact=True).click()
        expect(page.locator('.cookie-banner')).to_have_count(0)
        page.get_by_label('Username:',exact=True).fill(username)
        page.get_by_label('Password:',exact=True).fill(password)
        page.get_by_role('button',name='Sign in',exact=False).click()
        page.goto(base+'/companion/')
        expect(page.get_by_role('heading',name='Your companion')).to_be_visible()
        for width in [390,1440]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth')<=width+1
            axe(page)
            page.screenshot(path=str(root/f'artifacts/companion-{width}.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844})
        page.get_by_label('Tell me about today',exact=True).fill('Pip feels shy today')
        page.get_by_role('button',name='Send',exact=True).click()
        expect(page.locator('.chat-message.assistant')).to_contain_text('quiet places')
        page.get_by_role('link',name='Remember quiet places',exact=True).click()
        page.get_by_role('button',name='Review choice',exact=True).click()
        expect(page.get_by_role('heading',name='Confirm your choice')).to_be_visible()
        assert db(lambda: Pet.objects.get(pk=pet.pk).social_comfort)==''
        axe(page)
        page.get_by_role('link',name='Change',exact=True).click()
        page.get_by_label('Preference:',exact=True).select_option('energy_level')
        page.get_by_label('New value:',exact=True).select_option('gentle')
        page.get_by_role('button',name='Review choice',exact=True).click()
        expect(page.locator('main')).to_contain_text('Gentle, slower days')
        page.get_by_role('button',name='Confirm',exact=True).click()
        expect(page.get_by_role('heading',name='Saved',exact=True)).to_be_visible()
        assert db(lambda: Pet.objects.get(pk=pet.pk).energy_level)=='gentle'
        page.get_by_role('link',name='View in app').click()
        expect(page).to_have_url(base+f'/pets/{pet.pk}/personality/')
        page.goto(base+'/companion/')
        page.locator('a[href*="action=plan"]').first.click()
        page.get_by_label('When:',exact=True).fill((timezone.localtime()+timedelta(days=2)).strftime('%Y-%m-%dT%H:%M'))
        page.get_by_role('button',name='Review choice',exact=True).click()
        expect(page.get_by_role('heading',name='Confirm your choice')).to_be_visible()
        assert db(lambda: Task.objects.filter(pet=pet).count())==0
        page.get_by_role('button',name='Cancel',exact=True).click()
        expect(page.get_by_role('heading',name='Cancelled',exact=True)).to_be_visible()
        assert db(lambda: Task.objects.filter(pet=pet).count())==0
        page.goto(base+'/companion/')
        page.locator('a[href*="action=plan"]').first.click()
        page.get_by_label('When:',exact=True).fill((timezone.localtime()+timedelta(days=2)).strftime('%Y-%m-%dT%H:%M'))
        page.get_by_role('button',name='Review choice',exact=True).click()
        page.get_by_role('button',name='Confirm',exact=True).click()
        expect(page.get_by_role('heading',name='Saved',exact=True)).to_be_visible()
        assert db(lambda: Task.objects.filter(pet=pet).count())==1
        page.get_by_role('link',name='View in app').click()
        assert '/plans/' in page.url
        if provider:
            page.goto(base+f'/providers/{provider.pk}/')
            page.get_by_role('link',name='Ask companion',exact=True).click()
            page.get_by_role('link',name='Review saving service',exact=True).click()
            page.get_by_role('button',name='Review choice',exact=True).click()
            page.get_by_role('button',name='Confirm',exact=True).click()
            expect(page.get_by_role('heading',name='Saved',exact=True)).to_be_visible()
            assert db(lambda: SavedProvider.objects.filter(owner=owner,provider=provider).exists())
        assert not errors,errors
        browser.close()
    print('PASS: phone/desktop layout, axe, chat, change/confirm, cancel, calendar and directory integration')
finally:
    owner.delete()
