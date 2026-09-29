export type MapPoint = {lat:number;lon:number};
export const directoryOrigin:MapPoint={lat:-27.42,lon:153.025};
export function distanceKm(from:MapPoint,to:MapPoint):number|null {
  if (![from,to].every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180))return null;
  const radians=(n:number)=>n*Math.PI/180;
  const a=Math.sin(radians(to.lat-from.lat)/2)**2+Math.cos(radians(from.lat))*Math.cos(radians(to.lat))*Math.sin(radians(to.lon-from.lon)/2)**2;
  return 6371*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
}
export function nearestPlaces<T extends MapPoint>(places:T[],origin:MapPoint) {
  return places.map(place=>({place,km:distanceKm(origin,place)})).sort((a,b)=>(a.km??Infinity)-(b.km??Infinity));
}
export function kilometres(km:number|null){return km===null?'Distance unavailable':km<.1?'< 0.1 km':`${km.toLocaleString('en-AU',{minimumFractionDigits:1,maximumFractionDigits:1})} km`;}
