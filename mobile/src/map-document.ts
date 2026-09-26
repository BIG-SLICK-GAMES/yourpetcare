import { Provider } from './types';
import { WalkMap } from './map-props';
export function mapDocument(providers:Provider[], center?:{lat:number;lon:number}, walk?:WalkMap) {
  const data=JSON.stringify(providers.map(p=>({id:p.id,name:p.name,lat:p.lat,lon:p.lon,category:p.category}))).replace(/</g,'\\u003c');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#e6ecdf;font-family:Arial,sans-serif}.pin{display:grid;place-items:center;background:#315d50;color:white;border:4px solid #d9e3d2;border-radius:50%;font-size:15px;font-weight:bold;box-sizing:border-box}.service{background:#a95535;border:3px solid white;font-size:18px}.leaflet-container{font-family:Arial,sans-serif}#status{position:absolute;top:10px;left:50px;z-index:1000;background:#fffaf0;color:#244e46;padding:9px 14px;border-radius:14px;font-size:12px}</style></head><body><div id="map" aria-label="Pet services map"></div><div id="status">Loading map…</div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
  const points=${data}; const walk=${JSON.stringify(walk||null).replace(/</g,'\\u003c')};
  function select(id){const message=JSON.stringify({type:'ypc-service',id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*');}
  if(typeof L==='undefined'){document.getElementById('status').textContent='Map unavailable. Use the service list below.';}else{
  const map=L.map('map',{zoomControl:true}).setView([${center?.lat??-27.42},${center?.lon??153.025}],${center?14:11});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'}).addTo(map);
  const layer=L.layerGroup().addTo(map);
  function draw(){layer.clearLayers();const cells=new Map(),z=map.getZoom();points.forEach(p=>{const xy=map.project([p.lat,p.lon],z),key=z>=18?p.id:Math.floor(xy.x/65)+':'+Math.floor(xy.y/65);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);});
  cells.forEach(group=>{const count=group.length,lat=group.reduce((n,p)=>n+p.lat,0)/count,lon=group.reduce((n,p)=>n+p.lon,0)/count;const symbol=group[0].category==='park'?'♧':group[0].category==='vet'?'+':'•';const marker=L.marker([lat,lon],{title:count>1?count+' services':group[0].name,icon:L.divIcon({className:'pin '+(count===1?'service':''),html:count>1?String(count):symbol,iconSize:count>1?[46,46]:[34,34]})}).addTo(layer);marker.on('click',()=>{if(count>1)map.setView([lat,lon],Math.min(z+2,19));else select(group[0].id);});});
  document.getElementById('status').textContent=walk?'Tap map to choose '+walk.pick:points.length+' services - tap to explore';}
  if(walk){
    map.on('click',event=>{const message=JSON.stringify({type:'ypc-point',point:{lat:event.latlng.lat,lon:event.latlng.lng}});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*');});
    for(const [key,label] of [['start','A'],['end','B']])if(walk[key])L.marker([walk[key].lat,walk[key].lon],{title:key,icon:L.divIcon({className:'pin',html:label,iconSize:[38,38]})}).addTo(map);
    if(walk.route){const line=L.geoJSON(walk.route.geometry,{style:{color:'#315d50',weight:6,opacity:.9}}).addTo(map);map.fitBounds(line.getBounds(),{padding:[35,35],maxZoom:16});}
    else if(walk.start&&walk.end)map.fitBounds([[walk.start.lat,walk.start.lon],[walk.end.lat,walk.end.lon]],{padding:[40,40],maxZoom:16});
  }
  map.on('zoomend',draw);draw();if(points.length&&points.length<20&&!${Boolean(center)})map.fitBounds(points.map(p=>[p.lat,p.lon]),{padding:[40,40],maxZoom:14});
  }
  </script></body></html>`;
}
