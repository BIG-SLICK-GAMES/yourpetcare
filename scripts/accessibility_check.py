import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://127.0.0.1:8000/accounts/login/')
    page.get_by_label('Username:').fill('demo')
    page.get_by_label('Password:', exact=True).fill('Local-Paws-2026!')
    page.get_by_role('button', name='Sign in').click()
    page.wait_for_url('http://127.0.0.1:8000/')
    reports = []
    for path in ['/', '/pets/', '/pets/1/', '/calendar/', '/supplies/', '/find-care/', '/tasks/add/', '/settings/']:
        page.goto('http://127.0.0.1:8000'+path, wait_until='networkidle')
        page.add_script_tag(path=str(root/'artifacts/axe.min.js'))
        results = page.evaluate("async () => await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})")
        violations = [{'id': v['id'], 'impact': v['impact'], 'help': v['help'], 'nodes': [{'target': n['target'], 'summary': n.get('failureSummary', '')} for n in v['nodes']]} for v in results['violations']]
        reports.append({'path': path, 'violations': violations})
        print(path, [(v['id'], len(v['nodes'])) for v in violations], flush=True)
    (root/'artifacts/accessibility-report.json').write_text(json.dumps(reports, indent=2), encoding='utf-8')
    browser.close()
