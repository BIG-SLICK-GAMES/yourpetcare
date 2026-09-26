"""Local browser smoke and responsive checks. Uses sample account only."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')

root = Path(__file__).resolve().parent.parent
artifacts = root / 'artifacts'
artifacts.mkdir(exist_ok=True)
base = 'http://127.0.0.1:8000'
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.goto(base, wait_until='networkidle')
    page.screenshot(path=str(artifacts/'welcome-desktop.png'), full_page=True)
    page.get_by_role('link', name='Sign in ↗').click()
    page.get_by_label('Username:').fill('demo')
    page.get_by_label('Password:', exact=True).fill('Local-Paws-2026!')
    page.get_by_role('button', name='Sign in →').click()
    page.wait_for_url(base + '/')
    page.get_by_role('heading', name='A good day for a little care.').wait_for()
    page.screenshot(path=str(artifacts/'overview-desktop.png'), full_page=True)
    reports = []
    for width, height in [(1440, 1050), (768, 1024), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        for path in ['/', '/pets/', '/calendar/', '/supplies/', '/pets/1/', '/find-care/', '/settings/', '/tasks/add/', '/records/add/']:
            response = page.goto(base+path, wait_until='networkidle')
            assert response.status == 200, (path, response.status)
            metrics = page.evaluate('({width: innerWidth, content: document.documentElement.scrollWidth})')
            assert metrics['content'] <= width+1, (path, width, metrics)
            reports.append({'path': path, 'width': width, 'status': response.status, 'horizontal_overflow': False})
            if width == 390 and path in ['/', '/calendar/', '/supplies/', '/find-care/']:
                page.screenshot(path=str(artifacts/('mobile-' + (path.strip('/').replace('/', '-') or 'overview') + '.png')), full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.goto(base+'/find-care/', wait_until='networkidle')
    page.get_by_label('Suburb or postcode').fill('North Lakes QLD')
    page.get_by_role('button', name='Find care ↗', exact=True).click()
    page.wait_for_load_state('networkidle', timeout=60000)
    page.screenshot(path=str(artifacts/'find-care-desktop.png'), full_page=True)
    print('LIVE SEARCH:', page.locator('.provider-results').inner_text()[:2200])
    print('BROWSER ERRORS:', errors)
    assert not errors
    (artifacts/'browser-report.json').write_text(json.dumps(reports, indent=2), encoding='utf-8')
    browser.close()
    print(f'Passed {len(reports)} page/viewport checks. Screenshots saved in artifacts/.')
