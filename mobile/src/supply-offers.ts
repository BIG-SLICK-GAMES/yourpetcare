import { api } from './api';
import { Account, Catalog, SupplySource, SupplyFeed } from './types';
export function sourceFor(website:string,name:string,sources:SupplySource[]){
  return sources.find(source=>{try{return website?new URL(website).hostname.replace(/^www\./,'')===new URL(source.website).hostname.replace(/^www\./,''):name.toLowerCase()===source.name.toLowerCase();}catch{return false;}});
}
export async function fetchSupplyOffers(account:Account,catalog:Catalog):Promise<SupplyFeed[]>{
  const ids=[...new Set((account.supplies?.stores||[]).map(s=>sourceFor(s.website,s.name,catalog.supplyStores||[])?.id).filter((id):id is string=>!!id))];
  return Promise.all(ids.map(async id=>{try{return await api<SupplyFeed>(`supply-offers?store=${encodeURIComponent(id)}`);}catch{return {storeId:id,status:'unavailable' as const,checkedAt:'',offers:[]};}}));
}
