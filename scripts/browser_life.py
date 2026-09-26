"""Local UI test for pet discovery, multi-pet plans, rescheduling and mobile layout."""
import sys
import time
import json
from pathlib import Path
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8')
base = 'http://127.0.0.1:8000'
out = Path(__file__).resolve().parent.parent/'artifacts'
out.mkdir(exist_ok=True)
username = f'lifeqa_{int(time.time())}'
password = 'Temporary-Planner-927!'
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base+'/accounts/signup/')
    page.get_by_label('Username', exact=True).fill(username)
    page.get_by_label('Email', exact=True).fill(username+'@example.test')
    page.get_by_label('Password', exact=True).fill(password)
    page.get_by_label('Password confirmation', exact=True).fill(password)
    page.get_by_role('button', name='Create account', exact=True).click()
    page.wait_for_url(base+'/pets/add/')
    page.get_by_label('Name', exact=True).fill('Stormy Test')
    page.get_by_role('button', name='Save pet', exact=True).click()
    page.get_by_role('link', name='Get to know Stormy Test').click()
    page.get_by_label('Or an estimated age').fill('3 years (test)')
    page.get_by_label('Where are you with training?').select_option('basics')
    page.get_by_label('Their kind of day').select_option('balanced')
    page.get_by_label('How do they feel in social places?').select_option('building')
    page.get_by_label('Everyday training', exact=True).check()
    page.get_by_label('Pet-friendly stays', exact=True).check()
    page.get_by_label('What would you like to work towards?').fill('A calm weekend away together.')
    page.get_by_role('button', name='Save & find our next adventure').click()
    expect(page.get_by_role('heading', name='More than the everyday.')).to_be_visible()
    life_url = page.url
    print('PASS guided profile and matched ideas', flush=True)
    for width in [390, 768, 1440]:
        page.set_viewport_size({'width':width,'height':900})
        page.goto(life_url)
        expect(page.get_by_role('heading',name='More than the everyday.')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth') <= width+1
        page.screenshot(path=str(out/f'life-{width}.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.goto(base+'/pets/add/')
    page.get_by_label('Name',exact=True).fill('Mochi Test')
    page.get_by_label('Species',exact=True).select_option('Cat')
    page.get_by_role('button',name='Save pet',exact=True).click()
    page.goto(base+'/plans/new/hotel/')
    page.get_by_label('Stormy Test',exact=True).check()
    page.get_by_label('Mochi Test',exact=True).check()
    page.get_by_label('Title',exact=True).fill('Test weekend away')
    date=datetime.now()+timedelta(days=45)
    page.get_by_label('When does it start?').fill(date.strftime('%Y-%m-%dT10:00'))
    page.get_by_label('When does it finish?').fill((date+timedelta(days=2)).strftime('%Y-%m-%dT10:00'))
    page.get_by_label('Where are you going?').fill('Brisbane, Queensland')
    page.get_by_role('button',name='Add plan & preparation to calendar',exact=True).click()
    expect(page.get_by_role('heading',name='Test weekend away',exact=True,level=1)).to_be_visible()
    plan_url=page.url
    assert page.locator('.task-row').count()==10
    print('PASS shared plan, preparation and reminders',flush=True)
    page.get_by_role('button',name='Complete Ask about your pet’s species, size and room restrictions for Stormy Test',exact=True).click()
    expect(page.get_by_text('1 of 10 calendar items completed',exact=True)).to_be_visible()
    page.get_by_role('link',name='Edit / reschedule').click()
    expect(page.get_by_label('Title',exact=True)).to_have_value('Test weekend away')
    page.get_by_label('When does it start?').fill((date+timedelta(days=7)).strftime('%Y-%m-%dT10:00'))
    page.get_by_label('When does it finish?').fill((date+timedelta(days=9)).strftime('%Y-%m-%dT10:00'))
    page.get_by_role('button',name='Save changes & move pending tasks',exact=True).click()
    expect(page.get_by_role('heading',name='Test weekend away',exact=True,level=1)).to_be_visible()
    expect(page.get_by_text('1 of 10 calendar items completed',exact=True)).to_be_visible()
    page.get_by_label('What needs doing?').fill('Pack favourite bedding')
    page.get_by_label('When should it happen?').fill((date+timedelta(days=6)).strftime('%Y-%m-%dT10:00'))
    page.get_by_role('button',name='Add a preparation step').click()
    expect(page.get_by_text('1 of 12 calendar items completed',exact=True)).to_be_visible()
    page.screenshot(path=str(out/'plan-mobile.png'),full_page=True)
    print('PASS rescheduling, preserved history and custom preparation',flush=True)
    page.get_by_role('link',name='View on calendar').click()
    page.get_by_label('View',exact=True).select_option('agenda')
    page.get_by_role('button',name='Apply',exact=True).click()
    expect(page.get_by_role('heading',name='Your agenda',exact=True)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth')<=391
    print('PASS calendar agenda',flush=True)
    reports=[]
    for path in [life_url,plan_url,base+'/plans/new/flight/',base+'/reminders/',base+'/calendar/?view=agenda']:
        page.goto(path)
        assert page.evaluate('document.documentElement.scrollWidth')<=391
        if (out/'axe.min.js').exists():
            page.add_script_tag(path=str(out/'axe.min.js'))
            result=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
            violations=[{'id':v['id'],'nodes':[{'target':n['target'],'summary':n.get('failureSummary','')} for n in v['nodes']]} for v in result['violations']]
            reports.append({'path':path,'violations':violations})
    (out/'life-accessibility.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
    page.goto(plan_url)
    page.get_by_text('Cancel this plan',exact=True).click()
    page.get_by_role('button',name='Cancel plan & pending reminders',exact=True).click()
    expect(page.get_by_text('Plan cancelled. Pending tasks and reminders have been stopped; past history is preserved.',exact=True)).to_be_visible()
    page.goto(base+'/settings/')
    page.get_by_text('Delete account and private data',exact=True).click()
    page.get_by_label('Type DELETE',exact=True).fill('DELETE')
    page.get_by_label('Current password',exact=True).fill(password)
    page.get_by_role('button',name='Permanently delete my account',exact=True).click()
    expect(page.get_by_text('Your account and private records have been deleted.',exact=True)).to_be_visible()
    assert not errors,errors
    print('PASS cancellation, account cleanup and no JavaScript errors',flush=True)
    print('Accessibility:',[(r['path'],len(r['violations'])) for r in reports],flush=True)
    browser.close()
