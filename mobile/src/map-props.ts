import type { MapPoint, Provider, WalkRoute } from './types';
export type WalkMap = {start?:MapPoint;end?:MapPoint;route?:WalkRoute;pick:'start'|'end'};
export type MapProps = {providers:Provider[];onSelect:(id:string)=>void;center?:MapPoint;walk?:WalkMap;onPick?:(point:MapPoint)=>void};
export function validMapPoint(p:MapPoint){return !!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=85&&Math.abs(p.lon)<=180;}
