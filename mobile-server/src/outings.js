import { Problem } from './domain.js';
import { point, routingFetch } from './walking-routes.js';
import { readFileSync } from 'node:fs';
const directory=JSON.parse(readFileSync(new URL('./outing-places.json',import.meta.url),'utf8'));
const cache=new Map();let nextQuery=0;
export async function nearbyOutings(body,{fetcher=routingFetch,now=Date.now(),localPlaces=directory}={}){
  const start=point(body.start),lat=start.lat.toFixed(3),lon=start.lon.toFixed(3),key=`${lat},${lon}`;
  const nearby=localPlaces.filter(p=>Math.hypot((p.lat-start.lat)*111195,(p.lon-start.lon)*111195*Math.cos(start.lat*Math.PI/180))<=3000);
  if(nearby.length)return {places:nearby,notice:'Brisbane council parks and selected venue listings, checked 27 Sep 2026. Cafe coverage is limited; check current access before visiting.'};
  if(cache.get(key)?.expires>now)return cache.get(key).data;
  if(now<nextQuery)throw new Problem('Nearby search is busy. Please try again in 15 seconds.',429);
  nextQuery=now+15000;
  const query=`[out:json][timeout:12];(nwr(around:3000,${lat},${lon})[amenity=cafe][name];nwr(around:3000,${lat},${lon})[leisure~"^(park|dog_park)$"][name][access!=private][dog!=no];);out center tags 100;`;
  let response,data;
  try{response=await fetcher('https://overpass.private.coffee/api/interpreter?data='+encodeURIComponent(query),{headers:{'User-Agent':'YourPetCare/0.1 (+https://github.com/BIG-SLICK-GAMES/yourpetcare)'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error();data=await response.json();if(!Array.isArray(data.elements)||data.remark)throw new Error();}
  catch{throw new Problem('Nearby stops could not load. You can still choose a destination on the map.',503);}
  const places=data.elements.flatMap(e=>{
    const tags=e.tags||{},location=e.center||e;
    if(!['node','way','relation'].includes(e.type)||!Number.isInteger(e.id)||typeof tags.name!=='string'||!Number.isFinite(location.lat)||!Number.isFinite(location.lon)||['no','private'].includes(tags.access)||tags.dog==='no')return [];
    return [{id:`${e.type}-${e.id}`,name:tags.name.slice(0,150),lat:location.lat,lon:location.lon,category:tags.amenity==='cafe'?'cafe':tags.leisure==='dog_park'?'dog_park':'park',dogAccess:['yes','leashed','designated'].includes(tags.dog)?tags.dog:tags.leisure==='dog_park'?'designated':'unknown',source:`https://www.openstreetmap.org/${e.type}/${e.id}`}];
  });
  const result={places};if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{expires:now+30*60000,data:result});return result;
}
