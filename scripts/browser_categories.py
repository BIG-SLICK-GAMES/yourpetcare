import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
sys.stdout.reconfigure(encoding='utf-8')
out=Path(__file__).resolve().parent.parent/'artifacts'
base='http://192.168.0.109:8000/'
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base)
    page.get_by_role('button',name='Essential only',exact=True).click()
    assert page.locator('.menu-category').count()==5
    assert page.locator('.category-menu .menu-tile').count()==28
    for width in [390,768,1440]:
        page.set_viewport_size({'width':width,'height':950})
        assert page.evaluate('document.documentElement.scrollWidth')<=width+1
        page.screenshot(path=str(out/f'categories-{width}.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_role('navigation',name='Menu categories').get_by_role('link',name='Fun Together',exact=True).click()
    assert page.locator('.menu-category').count()==1
    expect(page.get_by_role('link',name='Activities',exact=True)).to_be_visible()
    page.get_by_role('searchbox',name='What are you looking for?').fill('worming')
    page.get_by_role('button',name='Find it').click()
    expect(page.get_by_role('heading',name='Healthy Pets',exact=True)).to_be_visible()
    page.get_by_role('link',name='Worming',exact=True).click()
    expect(page.get_by_role('heading',name='Create account')).to_be_visible()
    assert 'kind%3Dworming' in page.url
    page.goto(base+'?q=wormimg')
    page.get_by_role('link',name='Did you mean “worming”?').click()
    expect(page.get_by_role('link',name='Worming',exact=True)).to_be_visible()
    page.goto(base+'?q=dinner')
    expect(page.get_by_role('heading',name='Out & About',exact=True)).to_be_visible()
    expect(page.get_by_role('link',name='Cafés & dining',exact=True)).to_be_visible()
    for query in ['', '?q=unfindablething', '?category=healthy']:
        page.goto(base+query)
        page.add_script_tag(path=str(out/'axe.min.js'))
        violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
        assert not violations,violations
    assert not errors,errors
    print('PASS LAN URL, 5 categories, 28 icons, responsive layouts, cross-category search, typo suggestion, save account gate, dining synonym and 3 accessibility scans',flush=True)
    browser.close()
