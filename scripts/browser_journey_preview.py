"""Anonymous local preview journey, service submission and responsive accessibility QA."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8')
out=Path(__file__).resolve().parent.parent/'artifacts'
base='http://127.0.0.1:8000'
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844})
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(base)
    expect(page.get_by_role('heading',name='What shall we do today?')).to_be_visible()
    expect(page.get_by_role('link',name='Meet my pet')).to_be_visible()
    for width in [390,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth')<=width+1
        page.screenshot(path=str(out/f'journey-home-{width}.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_role('link',name='Meet my pet').click()
    page.get_by_label('Their name',exact=True).fill('Juniper Preview Test')
    page.get_by_role('button',name='Let’s keep going').click()
    expect(page.get_by_role('heading',name='Lovely to meet you, Juniper Preview Test.')).to_be_visible()
    page.get_by_label('Dog',exact=True).check()
    page.get_by_role('button',name='Let’s keep going').click()
    page.get_by_label('In their grown-up years',exact=True).check()
    page.get_by_role('button',name='Let’s keep going').click()
    page.get_by_label('Learning the basics',exact=True).check()
    page.get_by_role('button',name='Let’s keep going').click()
    page.get_by_label('A little shy — let’s take it slowly',exact=True).check()
    page.screenshot(path=str(out/'conversation-mobile.png'),full_page=True)
    page.get_by_role('button',name='Let’s keep going').click()
    page.get_by_label('Play & enrichment',exact=True).check()
    page.get_by_role('button',name='Find our next good moment').click()
    expect(page.get_by_role('heading',name='A little more Juniper Preview Test time.')).to_be_visible()
    assert page.locator('.ready-cards article').count()==3
    page.locator('.ready-cards article').filter(has=page.get_by_role('heading',name='Make room for play')).get_by_role('link',name='Let’s pick a day').click()
    expect(page.get_by_label('Pick a day')).to_be_visible()
    assert page.get_by_label('Pick a day').input_value()
    page.get_by_role('button',name='Make a little time for this').click()
    expect(page.get_by_role('heading',name='It’s a date, Juniper Preview Test.')).to_be_visible()
    page.get_by_role('link',name='See our calendar').click()
    expect(page.get_by_role('button',name='Complete Make room for play for Juniper Preview Test',exact=True)).to_be_visible()
    print('PASS no-login conversation, matched ideas and calendar moment',flush=True)
    page.goto(base+'/services/add/')
    page.get_by_label('Dog walking',exact=True).check()
    page.get_by_label('Your service or business name').fill('Preview Test Walks')
    page.get_by_label('Which suburbs or towns do you cover?').fill('North Lakes')
    page.get_by_label('What would you like pet families to know?').fill('Browser test introduction only.')
    page.get_by_label('Your contact email:',exact=True).fill('preview-walks@example.test')
    page.get_by_label('I’m authorised to submit these details for review.').check()
    page.get_by_role('button',name='Send my introduction for review').click()
    expect(page.get_by_role('heading',name='Thanks for putting your hand up.')).to_be_visible()
    print('PASS walking service saved for review without login',flush=True)
    reports=[]
    for path in ['/','/journey/?step=feeling','/journey/ideas/','/community/rescue/','/community/giving/','/community/help/','/community/farewell/','/services/add/']:
        page.goto(base+path)
        assert page.evaluate('document.documentElement.scrollWidth')<=391,path
        page.add_script_tag(path=str(out/'axe.min.js'))
        report=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
        violations=[{'id':v['id'],'nodes':[{'target':n['target'],'summary':n.get('failureSummary','')} for n in v['nodes']]} for v in report['violations']]
        reports.append({'path':path,'violations':violations})
    (out/'journey-accessibility.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
    print('Accessibility:',[(r['path'],len(r['violations'])) for r in reports],flush=True)
    page.goto(base+'/settings/')
    page.get_by_label('Delete my preview pets, plans and submissions').check()
    page.get_by_role('button',name='Start a fresh preview').click()
    expect(page.get_by_role('link',name='Meet my pet')).to_be_visible()
    assert not errors,errors
    assert not any(r['violations'] for r in reports),reports
    print('PASS preview reset and no JavaScript errors',flush=True)
    browser.close()
