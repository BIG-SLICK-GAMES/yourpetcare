import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalDirectory,osmPlace,proposalPlaces,distanceKm} from '../src/global-places.js';
const row={type:'node',id:12,lat:51.5,lon:-.12,tags:{name:'London Vet',amenity:'veterinary',website:'javascript:alert(1)'}};
const response=data=>({ok:true,json:async()=>data});
test('worldwide search validates, caches, falls back and keeps unknown pet access honest',async()=>{
 let calls=0;const directory=createGlobalDirectory({fetcher:async url=>{calls++;assert.match(String(url),/51.5/);if(calls===1)throw Error('offline');return response({elements:[row,row,{...row,id:13,tags:{...row.tags,access:'private'}}]});}});
 const input={center:{lat:51.5,lon:-.12},category:'vet'};
 const result=await directory.search(input);assert.equal(result.places.length,1);assert.equal(calls,2);assert.equal(result.places[0].website,'');assert.deepEqual(result.places[0].species_supported,[]);
 await directory.search(input);assert.equal(calls,2);assert.equal(directory.get('osm:node:12').name,'London Vet');
 await assert.rejects(directory.search({...input,category:'vet];out;'}));
 await assert.rejects(directory.search({...input,center:{lat:120,lon:0}}));
 assert.ok(distanceKm({lat:0,lon:179.99},{lat:0,lon:-179.99})<3);
});
test('location search supports international names and caches explicit searches',async()=>{
 let calls=0;const directory=createGlobalDirectory({fetcher:async()=>{calls++;return response({features:[{geometry:{coordinates:[139.7,35.7]},properties:{name:'東京',country:'日本',type:'city'}}]});}});
 assert.equal((await directory.geocode({query:'Tokyo'})).locations[0].label,'東京, 日本');await directory.geocode({query:'Tokyo'});assert.equal(calls,1);
 await assert.rejects(directory.geocode({query:'x'}));
});
test('upstream failure is not reported as an empty directory',async()=>{
 const directory=createGlobalDirectory({fetcher:async()=>{throw Error('offline');}});
 await assert.rejects(directory.search({center:{lat:-36.85,lon:174.76}}),/could not load/);
});
test('only canonical searched records can become owner proposal snapshots',()=>{
 const place=osmPlace(row),account={placeRecords:[]};
 assert.throws(()=>proposalPlaces(account,{action:'save_service',data:{providerId:'fake',place}},[],{get:()=>null}),/Search/);
 const resolved=proposalPlaces(account,{action:'save_service',data:{providerId:place.id}},[],{get:()=>place});assert.deepEqual(resolved.records,[place]);assert.equal(account.placeRecords.length,0);
 const saved={placeRecords:[place]};assert.equal(proposalPlaces(saved,{action:'save_service',data:{providerId:place.id}},[],{get:()=>null}).records.length,0);
});
import {createApi} from '../src/server.js';
test('HTTP confirmed favourites survive search cache expiry and stay owner scoped',async t=>{
 const records=new Map(),repository={async create(a){records.set(a._id,structuredClone(a));return a;},async byUsername(n){return structuredClone([...records.values()].find(a=>a.username===n));},async byToken(h){return structuredClone([...records.values()].find(a=>a.tokens.some(t=>t.hash===h)));},async change(id,mutate){const a=structuredClone(records.get(id)),result=mutate(a);a.version++;records.set(id,a);return {account:structuredClone(a),result};}};
 let cached=osmPlace(row);const server=createApi({repository,providers:[],globalDirectory:{get:()=>cached}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const request=async(path,data,token)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/v1/${path}`,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,...await r.json()};};
 const first=await request('signup',{username:'global-owner',password:'test-global-password'}),other=await request('signup',{username:'global-other',password:'test-global-password'});
 const draft=await request('proposals',{action:'save_service',data:{providerId:cached.id}},first.token);assert.equal(draft.status,201);assert.equal(draft.account.placeRecords.length,0);
 cached=null;
 assert.equal((await request(`proposals/${draft.proposal.id}/decision`,{decision:'confirm'},other.token)).status,404);
 const saved=await request(`proposals/${draft.proposal.id}/decision`,{decision:'confirm'},first.token);assert.equal(saved.account.placeRecords[0].id,'osm:node:12');assert.equal(saved.account.saved[0],'osm:node:12');
 assert.equal((await request('account',null,other.token)).account.placeRecords.length,0);
 assert.equal((await request('account',null,first.token)).account.placeRecords[0].name,'London Vet');
});
test('Photon fallback returns real nearby records when richer listings are unavailable',async()=>{
 const directory=createGlobalDirectory({fetcher:async url=>{if(!String(url).includes('/reverse'))throw Error('busy');return response({features:[{properties:{osm_type:'N',osm_id:99,osm_key:'amenity',osm_value:'veterinary',name:'Tokyo Vet',city:'Tokyo'},geometry:{coordinates:[139.7,35.7]}}]});}});
 const result=await directory.search({center:{lat:35.7,lon:139.7},category:'vet'});assert.equal(result.places[0].name,'Tokyo Vet');assert.equal(result.limited,true);assert.equal(result.places[0].website,'');assert.deepEqual(result.places[0].species_supported,[]);
});
