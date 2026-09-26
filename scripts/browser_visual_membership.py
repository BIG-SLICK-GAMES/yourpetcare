import os
import re
import sys
import uuid
from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

def db(call):
    with ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(call).result()
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
from django.contrib.auth.models import User
from care.models import Pet, Provider, Audit

sys.stdout.reconfigure(encoding='utf-8')
out=root/'artifacts'
token=uuid.uuid4().hex[:12]
username='visual_qa_'+token
adminname='review_qa_'+token
password='Qa-only-'+uuid.uuid4().hex+'!'
base='http://192.168.0.109:8000/'
Image.new('RGB',(320,240),'#dab48e').save(out/'qa-photo.png')

def axe(page):
    page.add_script_tag(path=str(out/'axe.min.js'))
    violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
    assert not violations, (page.url,violations)

try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base)
        axe(page)
        page.get_by_role('button',name='Essential only',exact=True).click()
        expect(page.locator('.cookie-banner')).to_have_count(0)
        expect(page.locator('.ad-space')).to_have_count(1)
        page.goto(base+'pets/')
        expect(page.locator('.crew-add .scene')).to_be_visible()
        page.get_by_role('link',name=re.compile('Add a pet')).click()
        page.get_by_label('Their name',exact=True).fill('Visual QA companion')
        page.get_by_role('button',name='Continue').click()
        page.get_by_label('Bird',exact=True).check()
        page.get_by_label('Their kind',exact=False).fill('Cockatiel')
        page.get_by_role('button',name='Continue').click()
        for _ in range(4):
            page.get_by_role('button',name='Skip').click()
        expect(page.get_by_role('heading',name='Create account')).to_be_visible()
        expect(page.get_by_label('Username:',exact=True)).to_have_value('')
        page.get_by_label('Username:',exact=True).fill(username)
        page.get_by_label('Email:',exact=True).fill(username+'@example.test')
        page.get_by_label('Password:',exact=True).fill(password)
        page.get_by_label('Password confirmation:',exact=True).fill(password)
        axe(page)
        page.get_by_role('button',name='Create account').click()
        page.get_by_role('button',name='Skip').click()
        page.goto(base+'pets/')
        pet=db(lambda: Pet.objects.get(owner__username=username))
        page.get_by_role('link',name='Add a photo',exact=True).click()
        page.get_by_label('Choose a photo of your pet:',exact=True).set_input_files(out/'qa-photo.png')
        page.get_by_role('button',name='Send photo for approval').click()
        expect(page.locator('.photo-status')).to_contain_text('Waiting for approval')
        expect(page.locator(f'.pet-portrait img[src="/files/photo/{pet.pk}/"]')).to_have_count(0)
        for width in [390,1440]:
            page.set_viewport_size({'width':width,'height':950})
            assert page.evaluate('document.documentElement.scrollWidth')<=width+1
            page.screenshot(path=str(out/f'visual-crew-{width}.png'))
            axe(page)
        admin=db(lambda: User.objects.create_superuser(adminname,adminname+'@example.test',password))
        desk=browser.new_context().new_page()
        desk.goto(base+f'admin/care/pet/{pet.pk}/change/')
        desk.get_by_label('Username:',exact=True).fill(adminname)
        desk.get_by_label('Password:',exact=True).fill(password)
        desk.get_by_role('button',name='Log in').click()
        expect(desk.get_by_alt_text('Pet photo awaiting review')).to_be_visible()
        desk.get_by_label('Photo status:',exact=True).select_option('approved')
        desk.get_by_label('Photo review note:',exact=True).fill('Temporary browser QA image reviewed')
        desk.get_by_role('button',name='Save',exact=True).click()
        page.reload()
        expect(page.locator(f'.pet-portrait img[src="/files/photo/{pet.pk}/"]')).to_be_visible()
        provider=db(lambda: Provider.objects.first())
        page.goto(base+f'providers/{provider.pk}/')
        page.get_by_role('button',name='♡ Save service',exact=True).click()
        page.goto(base+'services/saved/')
        expect(page.get_by_role('link',name=provider.name,exact=True)).to_be_visible()
        for path in ['calendar/','tasks/add/','cookies/','find-care/?category=park','find-care/?category=vet',f'pets/{pet.pk}/photo/']:
            page.set_viewport_size({'width':390,'height':950})
            page.goto(base+path)
            expect(page.locator('.page-artwork > .scene')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth')<=391,(path,page.evaluate('document.documentElement.scrollWidth'))
            axe(page)
        page.goto(base+f'pets/{pet.pk}/picture/')
        page.get_by_label('Search pet pictures').fill('bearded dragon')
        page.get_by_role('button',name='Search',exact=True).click()
        expect(page.locator('.picture-choice')).to_have_count(1)
        page.get_by_role('link',name='Show all',exact=True).click()
        page.screenshot(path=str(out/'pet-picture-library-phone.png'))
        axe(page)
        page.get_by_role('button',name='Use Cockatiel picture',exact=True).click()
        expect(page.locator('.pet-portrait img[src*="pet-pictures/bird.svg"]')).to_be_visible()
        page.goto(base+'calendar/')
        page.screenshot(path=str(out/'visual-calendar-phone.png'))
        page.goto(base+'find-care/?category=vet')
        page.screenshot(path=str(out/'visual-vets-phone.png'))
        assert not errors,errors
        print('PASS cookie choices, account save gate and retained conversation, photo upload/admin approval, private saved services, illustrated pages, responsive layouts and accessibility',flush=True)
        browser.close()
finally:
    # Remove only the uniquely named QA accounts and their records/uploads.
    User.objects.filter(username__in=[username,adminname]).delete()
