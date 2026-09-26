"""Visual and interaction checks for the animated icon front door."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
sys.stdout.reconfigure(encoding='utf-8')
out=Path(__file__).resolve().parent.parent/'artifacts'
base='http://127.0.0.1:8000/'
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':1000})
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base)
    page.get_by_role('button',name='Essential only',exact=True).click()
    expect(page.get_by_role('heading',name='Explore')).to_be_visible()
    assert page.locator('.category-menu .menu-tile').count()==28
    for width in [1440,768,390]:
        page.set_viewport_size({'width':width,'height':1000})
        assert page.evaluate('document.documentElement.scrollWidth')<=width+1
        page.screenshot(path=str(out/f'icon-menu-{width}.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1000})
    sports=page.get_by_role('link',name='Activities',exact=True)
    sports.hover()
    expect(page.locator('.tile-sports .jump-dog')).to_have_css('animation-name','dog-fetch')
    # Sample the visible pose partway through the jump to verify real motion.
    page.wait_for_timeout(650)
    transform=page.locator('.tile-sports .jump-dog').evaluate('(el)=>getComputedStyle(el).transform')
    assert transform not in ['none','matrix(1, 0, 0, 1, 0, 0)'],transform
    sports.screenshot(path=str(out/'frisbee-hover.png'))
    page.get_by_role('button',name='Pause animations').click()
    sports.hover()
    expect(page.locator('.tile-sports .jump-dog')).to_have_css('animation-name','none')
    page.reload()
    expect(page.get_by_role('button',name='Play animations')).to_be_visible()
    page.get_by_role('button',name='Play animations').click()
    page.mouse.move(0,0)
    sports.focus()
    page.keyboard.press('Tab')
    page.keyboard.press('Shift+Tab')
    expect(page.locator('.tile-sports .jump-dog')).to_have_css('animation-name','dog-fetch')
    sports.press('Enter')
    page.wait_for_url('**/life/?category=sports')
    expect(page.get_by_role('heading',name='Explore a dog sport',exact=True)).to_be_visible()
    page.goto(base)
    page.add_script_tag(path=str(out/'axe.min.js'))
    report=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
    violations=[{'id':v['id'],'nodes':[n['target'] for n in v['nodes']]} for v in report['violations']]
    (out/'icon-menu-accessibility.json').write_text(json.dumps(violations,indent=2),encoding='utf-8')
    assert not violations,violations
    page.emulate_media(reduced_motion='reduce')
    sports.hover()
    expect(page.locator('.tile-sports .jump-dog')).to_have_css('animation-name','none')
    expect(page.get_by_role('button',name='Reduced motion on')).to_be_disabled()
    touch=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    mobile=touch.new_page()
    mobile.goto(base)
    mobile.get_by_role('link',name='Activities',exact=True).tap()
    mobile.wait_for_url('**/life/?category=sports')
    expect(mobile.get_by_role('heading',name='Explore a dog sport',exact=True)).to_be_visible()
    assert not errors,errors
    print('PASS 28 icons; 3 responsive sizes; animated frisbee hover; keyboard navigation; persistent pause; reduced motion; single-tap touch navigation; zero axe violations or JavaScript errors',flush=True)
    browser.close()
