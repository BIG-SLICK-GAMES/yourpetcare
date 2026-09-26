import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8')
out = Path(__file__).resolve().parent.parent / 'artifacts'
base = 'http://192.168.0.109:8000/'
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base)
    page.get_by_role('button',name='Essential only',exact=True).click()
    page.get_by_role('navigation', name='Menu categories').get_by_role('link', name='Explore the map', exact=True).click()
    expect(page.get_by_role('heading', name='Explore the map.')).to_be_visible()
    expect(page.locator('.leaflet-control-zoom')).to_be_visible()
    for animal in ['Horse','Bird','Reptile','Fish','Amphibian','Invertebrate']:
        page.get_by_label('For which companion?').select_option(animal)
    page.get_by_label('For which companion?').select_option('Horse')
    page.get_by_label('Name or service keyword').fill('equine')
    page.get_by_role('button', name='Use my location').click()
    expect(page.locator('#location-status')).to_contain_text('HTTPS')
    for width in [390,768,1440]:
        page.set_viewport_size({'width':width,'height':950})
        assert page.evaluate('document.documentElement.scrollWidth') <= width + 1
        assert page.locator('#care-map').bounding_box()['y'] < page.locator('.provider-results').bounding_box()['y']
        page.screenshot(path=str(out/f'map-animals-{width}.png'), full_page=False)
    page.locator('#care-map').scroll_into_view_if_needed()
    box = page.locator('#care-map').bounding_box()
    page.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2)
    page.mouse.down()
    page.mouse.move(box['x']+box['width']/2+65, box['y']+box['height']/2+35, steps=12)
    page.mouse.up()
    expect(page.locator('#search-area')).to_have_class('area-search dirty')
    page.get_by_role('button', name='Search this area').click()
    page.wait_for_url('**/find-care/?lat=*', timeout=60000)
    page.wait_for_load_state('domcontentloaded')
    query = parse_qs(urlparse(page.url).query)
    assert query['species'] == ['Horse'] and query['service_search'] == ['equine']
    assert query['lat'] != ['-27.470'] or query['lon'] != ['153.025']
    expect(page.get_by_label('For which companion?')).to_have_value('Horse')
    page.add_script_tag(path=str(out/'axe.min.js'))
    violations = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
    assert not violations, violations
    assert not errors, errors
    print('PASS visible map, 3 responsive sizes, animal filters, map drag/search preserves filters, local phone GPS explanation, accessibility and JavaScript checks', flush=True)
    browser.close()
