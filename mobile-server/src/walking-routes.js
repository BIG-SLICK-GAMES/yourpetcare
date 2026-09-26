import { Problem } from './domain.js';
import https from 'node:https';

// This EC2 host has no IPv6 route. Scope IPv4 to routing without changing other API clients.
export function routingFetch(url,options){
  return new Promise((resolve,reject)=>{
    const request=https.get(url,{headers:options.headers,signal:options.signal,family:4},response=>{
      const chunks=[];let bytes=0;
      response.on('data',chunk=>{bytes+=chunk.length;if(bytes>4000000){response.destroy(new Error('Routing response too large'));return;}chunks.push(chunk);});
      response.on('error',reject);
      response.on('end',()=>resolve({ok:response.statusCode===200,status:response.statusCode,text:()=>Buffer.concat(chunks).toString('utf8'),json:async()=>JSON.parse(Buffer.concat(chunks).toString('utf8'))}));
    });
    request.on('error',reject);
  });
}

export function point(value) {
  if(!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lon) || Math.abs(value.lat)>85 || Math.abs(value.lon)>180)throw new Problem('Choose a valid start and destination on the map.');
  return {lat:value.lat,lon:value.lon};
}
export async function walkingRoutes(body,{fetcher=routingFetch}={}) {
  const start=point(body.start),end=point(body.end);
  const radians=n=>n*Math.PI/180;
  const a=Math.sin(radians(end.lat-start.lat)/2)**2+Math.cos(radians(start.lat))*Math.cos(radians(end.lat))*Math.sin(radians(end.lon-start.lon)/2)**2;
  const distance=6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  if(distance<30 || distance>30000)throw new Problem('Choose points between 30 metres and 30 kilometres apart.');
  // routed-foot selects the pedestrian graph; OSRM's profile path is named driving by this host.
  const points=body.returnToStart===true?[start,end,start]:[start,end];
  const coordinates=points.map(p=>`${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  let response;
  try { response=await fetcher(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordinates}?alternatives=true&overview=full&geometries=geojson&steps=false&radiuses=${points.map(()=>100).join(';')}`,{
    headers:{'User-Agent':'YourPetCare/0.1 (+https://github.com/BIG-SLICK-GAMES/yourpetcare)'},signal:AbortSignal.timeout(20000),
  }); } catch { throw new Problem('Walking directions are temporarily unavailable. Try again shortly.',503); }
  if(!response.ok)throw new Problem('Walking directions are temporarily unavailable. Try again shortly.',503);
  const data=await response.json();
  if(data.code!=='Ok'||!Array.isArray(data.routes)||!data.routes.length)throw new Problem('No connected walking path was found. Try points nearer a path.',422);
  const routes=data.routes.slice(0,3).map((route,index)=>{
    const geometry=route.geometry;
    if(geometry?.type!=='LineString'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2||geometry.coordinates.length>50000||!geometry.coordinates.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90)||!Number.isFinite(route.distance)||route.distance<=0||!Number.isFinite(route.duration)||route.duration<=0)throw new Problem('The routing service returned an unusable path.',503);
    return {id:String(index),distance:Math.round(route.distance),minutes:Math.max(1,Math.round(route.duration/60)),geometry};
  });
  return {routes};
}
