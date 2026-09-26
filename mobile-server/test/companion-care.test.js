import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAccount,stage,decide } from '../src/domain.js';
import { agentFacts,askAgent } from '../src/agent.js';
import { walkingRoutes } from '../src/walking-routes.js';
import { nearbyOutings } from '../src/outings.js';
const vets=[{id:'vet-1',category:'vet',name:'Test clinic',address:'Brisbane',species_supported:['Dog']},{id:'park-1',category:'park',name:'Park'}];
function owner(){const a=initialAccount('owner','hash');a.pets=[{id:'stormy',name:'Stormy',species:'Dog',breed:'',age:'',social:'quiet',training:'basics',goals:''}];return a;}
const ai=action=>({apiKey:'test',model:'test',fetcher:async()=>({ok:true,json:async()=>({output:[{type:'function_call',name:'offer_choice',arguments:JSON.stringify({reply:'Review this choice.',...action})}]})})});

test('preferred vet is per pet, validated, confirmed and retained across profile edits',()=>{
  const a=owner();a.pets.push({...a.pets[0],id:'other'});
  assert.throws(()=>stage(a,{action:'set_preferred_vet',petId:'stormy',data:{providerId:'park-1'}},vets));
  const p=stage(a,{action:'set_preferred_vet',petId:'stormy',data:{providerId:'vet-1'}},vets);
  assert.equal(a.pets[0].preferredVetId,undefined);decide(a,p.id,'confirm',vets);assert.equal(a.pets[0].preferredVetId,'vet-1');assert.equal(a.pets[1].preferredVetId,undefined);assert.match(p.report,/No appointment/);
  const edit=stage(a,{action:'update_pet',petId:'stormy',data:{...a.pets[0],careNotes:'Likes gentle walks'}},vets);decide(a,edit.id,'confirm',vets);
  assert.equal(a.pets[0].preferredVetId,'vet-1');assert.equal(agentFacts(a,'stormy',vets).preferredVet.name,'Test clinic');
});
test('meal routine saves profile and two daily events atomically, never on cancel, and cannot duplicate',()=>{
  const a=owner(),data={breakfastAt:new Date(Date.now()+86400000).toISOString(),dinnerAt:new Date(Date.now()+120000000).toISOString()};
  const input={action:'set_meal_routine',petId:'stormy',data};
  assert.throws(()=>stage(a,{...input,data:{...data,dinnerAt:'bad'}},vets));assert.equal(a.events.length,0);
  let p=stage(a,input,vets);decide(a,p.id,'cancel',vets);assert.equal(a.pets[0].mealRoutine,undefined);
  p=stage(a,input,vets);assert.equal(a.events.length,0);decide(a,p.id,'confirm',vets);decide(a,p.id,'confirm',vets);
  assert.equal(a.events.length,2);assert.deepEqual(a.pets[0].mealRoutine,data);assert.ok(a.events.every(e=>e.repeatDays===1&&e.petId==='stormy'));assert.match(p.report,/profile.*calendar/);
  assert.throws(()=>stage(a,input,vets),/already exist/);
  const updated=stage(a,{...input,data:{...data,breakfastAt:new Date(Date.parse(data.breakfastAt)+3600000).toISOString()}},vets);decide(a,updated.id,'confirm',vets);
  assert.equal(a.events.filter(e=>e.status==='planned').length,2);assert.equal(a.events.filter(e=>e.status==='cancelled').length,2);
  const stop=stage(a,{action:'stop_meal_routine',petId:'stormy',data:{}},vets);assert.equal(a.events.filter(e=>e.status==='planned').length,2);decide(a,stop.id,'confirm',vets);assert.equal(a.events.filter(e=>e.status==='planned').length,0);assert.equal(a.pets[0].mealRoutine,undefined);
});
test('nearby stops distinguish recorded dog access and omit private places',async()=>{
  let queries=0;
  const fetcher=async()=>{queries++;return {ok:true,json:async()=>({elements:[
    {type:'node',id:1,lat:-27.4,lon:153,tags:{name:'Dog cafe',amenity:'cafe',dog:'yes'}},
    {type:'node',id:2,lat:-27.4,lon:153,tags:{name:'Unknown cafe',amenity:'cafe'}},
    {type:'node',id:3,lat:-27.4,lon:153,tags:{name:'Private park',leisure:'park',access:'private'}},
    {type:'way',id:4,center:{lat:-27.4,lon:153},tags:{name:'Dog park',leisure:'dog_park'}},
  ]})};};
  const body={start:{lat:-27.4,lon:153}},options={fetcher,now:100000,localPlaces:[]};
  const result=await nearbyOutings(body,options);assert.equal(result.places.length,3);assert.equal(result.places[0].dogAccess,'yes');assert.equal(result.places[1].dogAccess,'unknown');assert.equal(result.places[2].category,'dog_park');
  await nearbyOutings(body,options);assert.equal(queries,1);
  await assert.rejects(nearbyOutings({start:{lat:-28,lon:153}},options),/busy/);
});
test('AI remembers notes with confirmation and routes handoff is read only',async()=>{
  const a=owner();a.pets[0].careNotes='Prefers quiet paths';const facts=agentFacts(a,'stormy',vets);
  const response=await askAgent(facts,[],'Remember her favourite toy',ai({action:'remember_care',careNote:'Loves her blue ball'}));
  const p=stage(a,response.input,vets);assert.equal(a.pets[0].careNotes,'Prefers quiet paths');decide(a,p.id,'confirm',vets);assert.match(a.pets[0].careNotes,/quiet paths\nLoves/);
  const route=await askAgent(facts,[],'Map out a walk',ai({action:'show_walk_routes'}));assert.equal(route.input,null);assert.deepEqual(route.navigation,{screen:'map',mode:'walk'});
});
test('pedestrian routes validate points, use foot graph and return actual geometry',async()=>{
  const body={start:{lat:-27.47,lon:153.02},end:{lat:-27.48,lon:153.025}};
  await assert.rejects(walkingRoutes({...body,start:{lat:'bad',lon:1}}),/valid start/);
  await assert.rejects(walkingRoutes({...body,end:body.start}),/30 metres/);
  const coordinates=[[153.02,-27.47],[153.023,-27.475],[153.025,-27.48]];
  const result=await walkingRoutes(body,{fetcher:async(url,options)=>{assert.match(url,/routed-foot\/route/);assert.ok(options.headers['User-Agent']);return {ok:true,json:async()=>({code:'Ok',routes:[{distance:1600,duration:1200,geometry:{type:'LineString',coordinates}}]})};}});
  assert.equal(result.routes[0].minutes,20);assert.deepEqual(result.routes[0].geometry.coordinates,coordinates);
  await assert.rejects(walkingRoutes(body,{fetcher:async()=>({ok:true,json:async()=>({code:'NoRoute'})})}),/No connected/);
  await assert.rejects(walkingRoutes(body,{fetcher:async()=>{throw new Error('private upstream detail');}}),/temporarily unavailable/);
});
