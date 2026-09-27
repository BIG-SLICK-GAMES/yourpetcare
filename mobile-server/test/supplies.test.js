import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAccount,stage,decide,accountView } from '../src/domain.js';
import { parseSupplyFeed,createSupplyFeeds,supplySources } from '../src/supplies.js';
test('store preferences belong to the owner, need confirmation, and reject stale changes',()=>{
 const a=initialAccount('owner','hash'),data={stores:[{name:'Local feed store',website:'https://example.com/'}],saleAlerts:true};
 const p=stage(a,{action:'set_supplies',data},[]);assert.equal(a.supplies,undefined);decide(a,p.id,'cancel',[]);assert.equal(a.supplies,undefined);
 const first=stage(a,{action:'set_supplies',data},[]),other=stage(a,{action:'set_supplies',data:{stores:[],saleAlerts:false}},[]);
 decide(a,first.id,'confirm',[]);decide(a,first.id,'confirm',[]);assert.deepEqual(accountView(a).supplies,data);assert.equal(a.events.length,0);assert.match(first.report,/No calendar events/);assert.throws(()=>decide(a,other.id,'confirm',[]),/changed/);
 assert.deepEqual(accountView(initialAccount('other','hash')).supplies,{stores:[],saleAlerts:false});
});
test('store input rejects executable URLs, credentials, duplicates and oversized lists',()=>{
 const a=initialAccount('owner','hash');
 for(const website of ['javascript:alert(1)','http://example.com','https://user:pass@example.com'])assert.throws(()=>stage(a,{action:'set_supplies',data:{stores:[{name:'Shop',website}],saleAlerts:true}},[]));
 assert.throws(()=>stage(a,{action:'set_supplies',data:{stores:Array(6).fill({name:'Shop',website:''}),saleAlerts:false}},[]));
 assert.throws(()=>stage(a,{action:'set_supplies',data:{stores:Array(2).fill({name:'Shop',website:''}),saleAlerts:false}},[]));
});
const source=supplySources[0];
const atom=`<feed><entry><id>one</id><title>Bulk buy</title><published>2020-01-01</published><link rel="alternate" href="${source.website}products/one"/></entry><entry><title>Unsafe link</title><link href="https://evil.example/product"/></entry></feed>`;
test('Atom and RSS use retailer links, deduplicate and never infer sale dates',()=>{
 const offers=parseSupplyFeed(atom,source);assert.equal(offers.length,1);assert.equal(offers[0].datesKnown,false);assert.equal(offers[0].startAt,undefined);
 const rss=`<rss><channel><item><title>Offer</title><link>${source.website}products/one</link></item><item><title>Repeat</title><link>${source.website}products/one</link></item></channel></rss>`;
 assert.equal(parseSupplyFeed(rss,source).length,1);assert.throws(()=>parseSupplyFeed('<!DOCTYPE x><feed/>',source));assert.throws(()=>parseSupplyFeed('a'.repeat(500001),source));assert.throws(()=>parseSupplyFeed('<html/>',source));
 const priced=price=>atom.replace('</entry>','<s:variant><s:price currency="AUD">'+price+'</s:price></s:variant></entry>');assert.notEqual(parseSupplyFeed(priced('90'),source)[0].id,parseSupplyFeed(priced('80'),source)[0].id);
});
test('feed reader fetches only reviewed sources, caches and fails without invented offers',async()=>{
 let calls=0;const read=createSupplyFeeds(async(url,options)=>{calls++;assert.equal(url,source.feedUrl);assert.equal(options.redirect,'error');return new Response(atom);});
 await assert.rejects(()=>read('https://127.0.0.1/secret'));assert.equal(calls,0);
 const [a,b]=await Promise.all([read(source.id),read(source.id)]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.status,'connected');await read(source.id);assert.equal(calls,1);
 const failed=await createSupplyFeeds(async()=>{throw new Error('offline');})(source.id);assert.equal(failed.status,'unavailable');assert.deepEqual(failed.offers,[]);
});

test('map stores retain their canonical branch and all place categories can be favourites without a pet',()=>{
 const a=initialAccount('owner','hash'), providers=[{id:'shop1',category:'shop',name:'Local shop',website:'https://example.com/',address:'1 River Road'},{id:'park1',category:'park',name:'River Park',address:'River Road'}];
 const p=stage(a,{action:'set_supplies',data:{stores:[{providerId:'shop1',name:'Forged name',website:''}],saleAlerts:false}},providers);
 assert.equal(p.data.stores[0].name,'Local shop');decide(a,p.id,'confirm',providers);assert.equal(a.supplies.stores[0].address,'1 River Road');
 assert.throws(()=>stage(a,{action:'set_supplies',data:{stores:[{providerId:'park1',name:'Park'}],saleAlerts:false}},providers));
 const fav=stage(a,{action:'save_service',data:{providerId:'park1'}},providers);assert.deepEqual(a.saved,[]);decide(a,fav.id,'confirm',providers);decide(a,fav.id,'confirm',providers);assert.deepEqual(a.saved,['park1']);assert.match(fav.report,/favourites/);
});
