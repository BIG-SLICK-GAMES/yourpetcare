import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { Problem } from './domain.js';

// Reviewed retailer-owned offer collections only. User-entered URLs are never fetched.
export const supplySources = [{id:'pet-mince-direct',name:'Pet Mince Direct',website:'https://www.petmincedirect.com.au/',offersUrl:'https://www.petmincedirect.com.au/collections/bulk-buy-deals',feedUrl:'https://www.petmincedirect.com.au/collections/bulk-buy-deals.atom',label:'Bulk-buy offers',verifiedAt:'2026-09-27'}];
export const publicSupplySources = supplySources.map(({feedUrl,...source})=>source);
const list=value=>value==null?[]:Array.isArray(value)?value:[value];
const plain=value=>String(typeof value==='object'?value?.['#text']||'':value||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
export function parseSupplyFeed(xml,source){
  if(Buffer.byteLength(xml)>500000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Unsupported feed');
  const data=new XMLParser({ignoreAttributes:false,processEntities:false,parseTagValue:false}).parse(xml);
  if(!data.feed&&!data.rss?.channel)throw new Error('Not an RSS or Atom feed');
  const rows=list(data.feed?.entry||data.rss?.channel?.item),seen=new Set();
  return rows.slice(0,100).flatMap(row=>{
    const title=plain(row.title).slice(0,150);
    const raw=typeof row.link==='string'?row.link:list(row.link).find(link=>!link['@_rel']||link['@_rel']==='alternate')?.['@_href'];
    let url;try{url=new URL(raw,source.website);if(url.protocol!=='https:'||url.host!==new URL(source.website).host||url.username||url.password)return [];}catch{return [];}
    if(!title||!raw)return [];
    if(seen.has(url.href))return [];seen.add(url.href);
    const prices=JSON.stringify(list(row['s:variant']).map(v=>v['s:price']));
    const id=createHash('sha256').update(source.id+url.href+title+prices).digest('hex').slice(0,16);
    return [{id,storeId:source.id,storeName:source.name,title,url:url.href,source:source.offersUrl,datesKnown:false}];
  }).slice(0,20);
}
export function createSupplyFeeds(fetcher=fetch){
  const cache=new Map(),pending=new Map();
  return async function offers(id){
    const source=supplySources.find(s=>s.id===id);if(!source)throw new Problem('This store has no connected offer feed.',404);
    const hit=cache.get(id);if(hit&&hit.until>Date.now())return hit.value;
    if(pending.has(id))return pending.get(id);
    const task=(async()=>{let value;
      try{
        const response=await fetcher(source.feedUrl,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'application/atom+xml, application/rss+xml','User-Agent':'YourPetCare/1.0 (offer feed reader)'}});
        if(!response.ok||Number(response.headers.get('content-length'))>500000)throw new Error('Feed unavailable');
        let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>500000)throw new Error('Feed too large');chunks.push(chunk);}
        value={storeId:id,status:'connected',checkedAt:new Date().toISOString(),offers:parseSupplyFeed(Buffer.concat(chunks).toString('utf8'),source)};
      }catch{value={storeId:id,status:'unavailable',checkedAt:new Date().toISOString(),offers:[]};}
      cache.set(id,{until:Date.now()+(value.status==='connected'?1800000:60000),value});return value;
    })();pending.set(id,task);try{return await task;}finally{pending.delete(id);}
  };
}
