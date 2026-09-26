from pathlib import Path
from playwright.sync_api import sync_playwright, expect

out=Path(__file__).resolve().parent.parent/'artifacts'
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://192.168.0.109:8000/find-care/')
    page.get_by_role('button',name='Essential only',exact=True).click()
    expect(page.locator('.service-cluster').first).to_be_attached()
    page.locator('#care-map').scroll_into_view_if_needed()
    total=page.locator('#map-markers').evaluate('(el)=>JSON.parse(el.textContent).length')
    assert total > 1
    def represented():
        return page.evaluate("Array.from(document.querySelectorAll('.service-cluster')).reduce((n,e)=>n+Number(e.textContent),0)+document.querySelectorAll('.service-pin').length")
    assert represented()==total
    before=page.locator('.service-cluster,.service-pin').count()
    page.screenshot(path=str(out/'map-clusters-desktop.png'))
    result=page.evaluate("""()=>{
      const records=[{id:1,lat:0,lon:0},{id:2,lat:1,lon:1},{id:3,lat:200,lon:200},{id:4,lat:201,lon:201}];
      const project=(r,z)=>({x:r.lon*2**z,y:r.lat*2**z});
      return [0,7].map(z=>YPCMapClusters.group(records,z,project).map(g=>g.items.map(r=>r.id)));
    }""")
    assert [len(g) for g in result[0]]==[2,2] and len(result[1])==4,result
    for _ in range(7):
        page.locator('.leaflet-control-zoom-in').click()
        page.wait_for_function("!document.querySelector('.leaflet-zoom-anim')")
        assert represented()==total
    assert page.locator('.service-cluster,.service-pin').count()>=before
    # Show on map must reveal the exact selected service even inside a cluster.
    page.locator('.map-focus').first.click()
    expect(page.locator('.leaflet-popup')).to_be_visible()
    assert represented()==total
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#care-map').scroll_into_view_if_needed()
    page.screenshot(path=str(out/'map-clusters-phone.png'))
    assert page.evaluate('document.documentElement.scrollWidth')<=391
    page.add_script_tag(path=str(out/'axe.min.js'))
    violations=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
    assert not violations,violations
    assert not errors,errors
    print('PASS cluster counts retain every result, groups split with zoom, exact-service focus, responsive map, accessibility and JavaScript checks',flush=True)
    browser.close()
