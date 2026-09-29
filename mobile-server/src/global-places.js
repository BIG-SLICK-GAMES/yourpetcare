import {Problem} from './domain.js';
import {point,routingFetch} from './walking-routes.js';

const headers={'User-Agent':'YourPetCare/0.1 (+https://github.com/BIG-SLICK-GAMES/yourpetcare)','Accept':'application/json'};
const filters={
 park:['[leisure~"^(park|dog_park)$"]'],vet:['[amenity=veterinary]'],shop:['[shop~"^(pet|pet_supplies|equestrian)$"]'],
 cafe:['[amenity~"^(cafe|restaurant)$"]'],hotel:['[tourism~"^(hotel|motel|guest_house|camp_site)$"]'],
 boarding:['[amenity=animal_boarding]'],groomer:['[shop=pet_grooming]'],trainer:['[amenity=animal_training]','[leisure=horse_riding]'],
 sitter:['[amenity=animal_sitting]'],shelter:['[amenity=animal_shelter]'],charity:['[amenity=animal_shelter]'],funeral:['[amenity=pet_crematorium]','[landuse=animal_cemetery]'],
};
export const distanceKm=(a,b)=>{const rad=n=>n*Math.PI/180,x=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));};
function category(tags){if(tags.amenity==='veterinary')return 'vet';if(['pet','pet_supplies','equestrian'].includes(tags.shop))return 'shop';if(tags.shop==='pet_grooming')return 'groomer';if(['park','dog_park'].includes(tags.leisure))return 'park';if(['cafe','restaurant'].includes(tags.amenity))return 'cafe';if(['hotel','motel','guest_house','camp_site'].includes(tags.tourism))return 'hotel';if(tags.amenity==='animal_boarding')return 'boarding';if(tags.amenity==='animal_sitting')return 'sitter';if(tags.amenity==='animal_training'||tags.leisure==='horse_riding')return 'trainer';if(tags.amenity==='animal_shelter')return 'shelter';if(tags.amenity==='pet_crematorium'||tags.landuse==='animal_cemetery')return 'funeral';return null;}
const str=(v,max=300)=>typeof v==='string'?v.trim().slice(0,max):'';
function website(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href.slice(0,300):'';}catch{return '';}}
export function osmPlace(row){
 const t=row?.tags||{},c=row?.center||row,kind=category(t);
 if(!kind||!['node','way','relation'].includes(row.type)||!Number.isSafeInteger(row.id)||!str(t.name)||!Number.isFinite(c.lat)||!Number.isFinite(c.lon)||Math.abs(c.lat)>85||Math.abs(c.lon)>180||['private','no'].includes(t.access))return null;
 const dog=['yes','leashed','designated'].includes(t.dog)||t.leisure==='dog_park',horse=t.leisure==='horse_riding';
 return {id:`osm:${row.type}:${row.id}`,name:str(t.name,100),category:kind,address:str(t['addr:full']||[t['addr:housenumber'],t['addr:street'],t['addr:city']||t['addr:town']||t['addr:village'],t['addr:state'],t['addr:postcode'],t['addr:country']].filter(Boolean).join(', ')),lat:c.lat,lon:c.lon,website:website(t.website||t['contact:website']),phone:str(t.phone||t['contact:phone'],80),source:`https://www.openstreetmap.org/${row.type}/${row.id}`,species_supported:[...(dog?['Dog']:[]),...(horse?['Horse']:[])],pet_policy:t.dog==='no'?'Dogs are not allowed according to this listing.':dog?(t.dog==='leashed'?'Dogs on leads are recorded as welcome.':'Dog access is recorded. Confirm current conditions before visiting.'):'Pet access is not recorded. Check with the provider.',opening_hours:str(t.opening_hours),fetchedAt:new Date().toISOString()};
}
export function createGlobalDirectory({fetcher=routingFetch,now=Date.now,geocoder=process.env.YPC_GEOCODER_URL||'https://photon.komoot.io/api/',overpass=(process.env.YPC_OVERPASS_URLS||'https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter').split(',')}={}){
 const cache=new Map(),places=new Map(),pending=new Map();let nextGeo=0,nextSearch=0;
 function put(key,value,ttl){if(cache.size>=150)cache.delete(cache.keys().next().value);cache.set(key,{value,until:now()+ttl});}
 function cached(key){const hit=cache.get(key);if(hit?.until>now())return hit.value;cache.delete(key);}
 function remember(rows){for(const p of rows){if(places.size>=3000&&!places.has(p.id))places.delete(places.keys().next().value);places.set(p.id,{place:p,until:now()+86400000});}}
 async function json(url,timeout){const r=await fetcher(url,{headers,signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error('upstream');return r.json();}
 return {
  get(id){const hit=places.get(id);if(hit?.until>now())return hit.place;places.delete(id);return null;},
  async geocode(input){
   const q=typeof input.query==='string'?input.query.trim():'';if(q.length<2||q.length>160)throw new Problem('Enter a town, city, address or country (2–160 characters).');
   const key='geo:'+q.toLowerCase(),hit=cached(key);if(hit)return hit;
   if(now()<nextGeo)throw new Problem('Please wait a moment before searching again.',429);nextGeo=now()+1100;
   try{const url=new URL(geocoder);url.searchParams.set('q',q);url.searchParams.set('limit','5');const data=await json(url,12000);if(!Array.isArray(data.features))throw new Error();
    const locations=data.features.flatMap(f=>{const p=f.properties||{},[lon,lat]=f.geometry?.coordinates||[];if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180)return [];return [{lat,lon,zoom:p.type==='country'?4:p.type==='state'?6:p.type==='city'?12:14,label:[...new Set([p.name,p.city,p.state,p.country].filter(v=>typeof v==='string'&&v.trim()))].join(', ').slice(0,250)}];});
    const value={locations};put(key,value,86400000);return value;
   }catch{throw new Problem('Location search is unavailable right now. You can still use your location or move the map.',503);}
  },
  async search(input){
   const center=point(input.center),cat=input.category||'',radius=input.radius??5000;
   if((cat&&!filters[cat])||!Number.isInteger(radius)||radius<1000||radius>10000)throw new Problem('Choose a valid category and search distance.');
   const lat=Number(center.lat.toFixed(3)),lon=Number(center.lon.toFixed(3)),key=`places:${lat}:${lon}:${cat}:${radius}`,hit=cached(key);
   if(hit){remember(hit.places);return hit;}if(pending.has(key))return pending.get(key);
   if(now()<nextSearch)throw new Problem('Nearby search is busy. Please try again in a few seconds.',429);nextSearch=now()+3000;
   const selected=cat?filters[cat]:[...new Set(Object.values(filters).flat())];
   const query=`[out:json][timeout:10];(${selected.map(f=>`nwr(around:${radius},${lat},${lon})${f}[name][access!=private][access!=no];`).join('')});out center tags 150;`;
   const work=(async()=>{for(const endpoint of overpass.slice(0,2)){try{const url=new URL(endpoint);url.searchParams.set('data',query);const data=await json(url,8000);if(!Array.isArray(data.elements)||data.remark)throw new Error();
    const rows=[...new Map(data.elements.map(osmPlace).filter(Boolean).filter(p=>distanceKm(center,p)<=radius/1000+.2).map(p=>[p.id,p])).values()].sort((a,b)=>distanceKm(center,a)-distanceKm(center,b));
    const value={places:rows,center,radius,limited:data.elements.length>=150,attribution:'© OpenStreetMap contributors',notice:'Coverage varies by location. Pet access and opening hours need checking with the provider.'};remember(rows);put(key,value,1800000);return value;
   }catch{/* A second independent endpoint may be available. */}}
   // Photon offers a smaller directory when the richer Overpass sources are busy.
   try{
    const tags={park:['leisure:park','leisure:dog_park'],vet:['amenity:veterinary'],shop:['shop:pet','shop:pet_supplies','shop:equestrian'],cafe:['amenity:cafe','amenity:restaurant'],hotel:['tourism:hotel','tourism:motel','tourism:guest_house','tourism:camp_site'],boarding:['amenity:animal_boarding'],groomer:['shop:pet_grooming'],trainer:['amenity:animal_training','leisure:horse_riding'],sitter:['amenity:animal_sitting'],shelter:['amenity:animal_shelter'],charity:['amenity:animal_shelter'],funeral:['amenity:pet_crematorium','landuse:animal_cemetery']};
    const url=new URL('../reverse',geocoder);url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lon));url.searchParams.set('radius',String(radius/1000));url.searchParams.set('limit','50');
    for(const tag of cat?tags[cat]:[...new Set(Object.values(tags).flat())])url.searchParams.append('osm_tag',tag);
    const data=await json(url,10000);if(!Array.isArray(data.features))throw new Error();
    const rows=data.features.map(f=>{const p=f.properties||{},[lon,lat]=f.geometry?.coordinates||[];return osmPlace({type:{N:'node',W:'way',R:'relation'}[p.osm_type],id:p.osm_id,lat,lon,tags:{...(p.extra||{}),[p.osm_key]:p.osm_value,name:p.name,'addr:housenumber':p.housenumber,'addr:street':p.street,'addr:city':p.city,'addr:state':p.state,'addr:postcode':p.postcode,'addr:country':p.country}});}).filter(Boolean).filter(p=>distanceKm(center,p)<=radius/1000+.2);
    const unique=[...new Map(rows.map(p=>[p.id,p])).values()].sort((a,b)=>distanceKm(center,a)-distanceKm(center,b));
    const value={places:unique,center,radius,limited:true,attribution:'OpenStreetMap contributors / Photon',notice:'Limited directory results. Contact details and pet access may not be supplied.'};remember(unique);put(key,value,300000);return value;
   }catch{/* Both directory sources are unavailable. */}
   throw new Problem('Nearby places could not load. Try again, choose another category, or search a smaller area.',503);
   })();pending.set(key,work);try{return await work;}finally{pending.delete(key);}
  }
 };
}
export function placeCatalog(providers,account,extra=[]){return [...new Map([...providers,...(account.placeRecords||[]),...extra].map(p=>[p.id,p])).values()];}
export function proposalPlaces(account,input,providers,directory){
 const ids=['save_service','set_preferred_vet','set_pet_place'].includes(input.action)?[input.data?.providerId]:input.action==='set_supplies'?(Array.isArray(input.data?.stores)?input.data.stores:[]).map(s=>s?.providerId).filter(Boolean):[];
 const owned=placeCatalog(providers,account),records=ids.filter(id=>!owned.some(p=>p.id===id)).map(id=>directory.get(id));
 if(records.some(p=>!p))throw new Problem('Search for this place again before saving it.',404);
 if((account.placeRecords||[]).length+records.length>200)throw new Problem('Your saved directory has reached its current limit.');
 return {catalog:placeCatalog(providers,account,records),records};
}
