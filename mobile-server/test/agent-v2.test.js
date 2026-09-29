import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAccount,stage,decide,accountView,prepare} from '../src/domain.js';
import {buildAgentContext,resolvePet,deterministicCareReply} from '../src/agent-context.js';
import {agentReadTools} from '../src/agent-tools.js';
import {inventoryEstimate,nextOccurrence} from '../src/care.js';
import {askAgent} from '../src/agent.js';
import {proposalFromAgentResult} from '../src/agent-actions.js';
const now=Date.now(),future=()=>new Date(now+86400000).toISOString();
function owner(){const a=initialAccount('owner','private');a.pets=[{id:'stormy',name:'Stormy',species:'Dog',age:'3',social:'quiet',training:'basics',careSettings:{dining:{settling:'Blue mat'},health:{allergies:'Owner recorded allergy'},feeding:{food:'Recorded food'}}},{id:'luna',name:'Luna',species:'Cat',careNotes:'Luna-only private note'}];return a;}
function save(a,action,data,petId='stormy'){const p=stage(a,{action,petId,data},[]);decide(a,p.id,'confirm',[]);return p;}
function supply(a,quantity=1){return save(a,'save_inventory',{product:'Recorded worming tablets',category:'treatment',unit:'tablets',quantity,quantityAt:new Date(now).toISOString()}).resultId;}
function recurring(a,inventoryId){return save(a,'plan',{title:'Worming',startAt:future(),minutes:5,recurrence:{unit:'month',interval:1},...(inventoryId?{inventoryId,quantityUsed:1}:{})}).resultId;}

test('context: selected pet isolation, minimal retrieval and known memory reuse',()=>{
 const a=owner();const c=buildAgentContext(a,a.pets[0],[],'Plan a cafe outing');assert.equal(c.pet.careSettings.dining.settling,'Blue mat');assert.ok(!JSON.stringify(c).includes('Luna-only'));assert.equal(c.pet.careSettings.feeding,undefined);assert.equal(c.services.length,0);
 const tools=agentReadTools(a,a.pets[0],[]);assert.ok(!JSON.stringify(tools.execute('get_pet_profile',{})).includes('Luna-only'));assert.equal(tools.execute('get_pet_care',{category:'feeding'}).values.food,'Recorded food');assert.throws(()=>tools.execute('run_sql',{}),/unavailable/);
});
test('pet resolution honours explicit names, rejects foreign selection and ambiguity',()=>{
 const a=owner();assert.equal(resolvePet(a,'stormy','Luna needs a vet').pet.id,'luna');assert.equal(resolvePet(a,'stormy','Stormy and Luna').ambiguous,true);assert.throws(()=>resolvePet(a,'foreign','hi'),/your pets/);
});
test('A: a known treatment date connects one confirmed remaining dose',()=>{
 const a=owner(),id=supply(a),event=recurring(a,id);const reply=deterministicCareReply(a,a.pets[0],"When's Stormy's worming?").reply;assert.match(reply,/Stormy/);assert.match(reply,/enough for this dose/);assert.match(reply,/following one/);assert.equal(a.events.find(e=>e.id===event).status,'planned');
});
test('B/F: completion survives refresh, consumes stock and creates exactly one recurrence',()=>{
 const a=owner(),id=supply(a),event=recurring(a,id);const p=stage(a,{action:'complete_event',petId:'stormy',data:{eventId:event}},[]);assert.equal(a.inventory[0].quantity,1);assert.equal(a.events.length,1);
 const refreshed=structuredClone(a);assert.equal(accountView(refreshed).proposals[0].id,p.id);decide(refreshed,p.id,'confirm',[]);decide(refreshed,p.id,'confirm',[]);
 assert.equal(refreshed.inventory[0].quantity,0);const audit=refreshed.audit.find(e=>e.id===p.id);assert.equal(audit.before.inventory.quantity,1);assert.equal(audit.after.inventory.quantity,0);assert.equal(audit.after.nextCare.length,1);assert.equal(refreshed.events.length,2);assert.equal(refreshed.events[0].completedBy,a._id);assert.equal(refreshed.events[1].completedAt,undefined);assert.equal(refreshed.audit.filter(e=>e.id===p.id).length,1);assert.match(refreshed.proposals.find(x=>x.id===p.id).report,/Supply remaining: 0/);
});
test('C: purchase adds to corrected balance and preserves consumption',()=>{
 const a=owner();const id=save(a,'save_inventory',{product:'Food',category:'food',unit:'g',quantity:15000,dailyUse:450,quantityAt:new Date(now).toISOString()}).resultId;
 const e=inventoryEstimate(a.inventory[0],now);assert.equal(e.days,33);save(a,'purchase_inventory',{id,quantity:15000,purchasedAt:new Date(now).toISOString()});assert.equal(a.inventory[0].quantity,30000);assert.equal(a.inventory[0].dailyUse,450);
 save(a,'save_inventory',{id,quantity:4500,quantityAt:new Date(now).toISOString()});assert.equal(inventoryEstimate(a.inventory[0],now).days,10);
});
test('E: household read includes care for all pets without model or mutation',()=>{
 const a=owner();recurring(a);save(a,'plan',{title:'Medication',startAt:future(),minutes:5},'luna');const before=JSON.stringify(a);const r=deterministicCareReply(a,a.pets[0],"What's coming up?");assert.match(r.reply,/Stormy/);assert.match(r.reply,/Luna/);assert.equal(r.input,null);assert.equal(JSON.stringify(a),before);
});
test('monthly and yearly recurrence clamp month-end without drift; fixed legacy days remain',()=>{
 const e={startAt:'2028-01-31T08:00:00Z',recurrence:{unit:'month',interval:1}};const feb=nextOccurrence(e,Date.parse(e.startAt));assert.equal(feb,'2028-02-29T08:00:00.000Z');assert.equal(nextOccurrence({...e,startAt:feb,recurrenceAnchor:e.startAt},Date.parse(feb)),'2028-03-31T08:00:00.000Z');
 assert.equal(nextOccurrence({startAt:'2028-02-29T08:00:00Z',recurrence:{unit:'year',interval:1}},Date.parse('2028-02-29T08:00:00Z')),'2029-02-28T08:00:00.000Z');assert.equal(nextOccurrence({startAt:'2026-01-01T08:00:00Z',repeatDays:14},Date.parse('2026-01-01T08:00:00Z')),'2026-01-15T08:00:00.000Z');
});
test('zero and unknown quantities/rates stay distinct and estimates never go negative',()=>{
 assert.equal(inventoryEstimate({quantity:null}).kind,'unknown');assert.equal(inventoryEstimate({quantity:0}).remaining,0);assert.equal(inventoryEstimate({quantity:10,dailyUse:0}).days,null);assert.equal(inventoryEstimate({quantity:10,dailyUse:2,quantityAt:'2020-01-01T00:00:00Z'},now).remaining,0);
});
test('stale stock, underflow and cross-pet linkage cannot partially complete care',()=>{
 const a=owner(),id=supply(a),event=recurring(a,id),p=stage(a,{action:'complete_event',petId:'stormy',data:{eventId:event}},[]);a.inventory[0].quantity=2;assert.throws(()=>decide(a,p.id,'confirm',[]),/changed/);assert.equal(a.events[0].status,'planned');a.inventory[0].quantity=0;assert.throws(()=>stage(a,{action:'complete_event',petId:'stormy',data:{eventId:event}},[]),/quantity/);
 assert.throws(()=>stage(a,{action:'plan',petId:'luna',data:{title:'Care',startAt:future(),minutes:5,inventoryId:id,quantityUsed:1}},[]),/supply/);
});
test('cancellation, reschedule and snooze require review; no repeat after cancellation',()=>{
 const a=owner(),id=recurring(a);const p=stage(a,{action:'cancel_event',petId:'stormy',data:{eventId:id}},[]);assert.equal(a.events[0].status,'planned');decide(a,p.id,'cancel',[]);assert.equal(a.events[0].status,'planned');
 save(a,'update_event',{eventId:id,changes:{startAt:new Date(now+2*86400000).toISOString(),recurrence:{unit:'week',interval:2},reminderMinutes:60}});assert.equal(a.events[0].recurrence.interval,2);
 save(a,'snooze_event',{eventId:id,remindAt:future()});assert.equal(a.events[0].snoozedUntil,new Date(future()).toISOString());save(a,'cancel_event',{eventId:id});assert.equal(a.events[0].status,'cancelled');assert.throws(()=>stage(a,{action:'complete_event',petId:'stormy',data:{eventId:id}},[]),/not pending/);
});
test('care history can be recorded without inventing a recurring treatment',()=>{
 const a=owner();save(a,'record_care',{title:'Worming tablet',completedAt:new Date(now-1000).toISOString()});assert.equal(a.events.length,1);assert.equal(a.events[0].status,'completed');assert.equal(a.events[0].repeatDays,0);
});
test('new confirmed routine and dose recording is atomic; same pending care cannot be duplicated',()=>{
 const a=owner(),id=supply(a);save(a,'record_care',{title:'Worming',completedAt:new Date(now-1000).toISOString(),inventoryId:id,quantityUsed:1,recurrence:{unit:'month',interval:1},nextAt:future()});assert.equal(a.events.length,2);assert.equal(a.inventory[0].quantity,0);assert.throws(()=>stage(a,{action:'record_care',petId:'stormy',data:{title:'Worming',completedAt:new Date(now).toISOString()}},[]),/already scheduled/);
});
test('read tools cannot return another pet inventory or private document storage keys',()=>{
 const a=owner();a.inventory=[{id:'foreign',petId:'luna',quantity:3}];a.documents=[{id:'d',petId:'stormy',title:'Insurance',category:'insurance',storageRef:'private-key'}];const t=agentReadTools(a,a.pets[0],[]);assert.equal(t.execute('get_inventory',{}).inventory.length,0);assert.ok(!JSON.stringify(t.execute('list_documents',{})).includes('private-key'));
});
test('gateway can retrieve context then propose without executing; bounded strict read tools',async()=>{
 const a=owner(),facts=buildAgentContext(a,a.pets[0],[],'Remember her food');let calls=0;
 const fetcher=async(_url,options)=>{const body=JSON.parse(options.body);assert.equal(body.store,false);calls++;if(calls===1)return {ok:true,json:async()=>({output:[{type:'function_call',name:'get_pet_care',call_id:'read1',arguments:'{"category":"feeding"}'}]})};assert.ok(body.input.some(i=>i.type==='function_call_output'&&i.output.includes('Recorded food')));return {ok:true,json:async()=>({output:[{type:'function_call',name:'offer_choice',arguments:JSON.stringify({action:'none',reply:'I have Recorded food saved for Stormy. What changed?'})}]})};};
 const r=await askAgent(facts,[],'Remember her food',{apiKey:'mock',model:'mock',fetcher,readTools:agentReadTools(a,a.pets[0],[])});assert.equal(r.input,null);assert.equal(calls,2);
});
test('AI mutation IDs must come from the authorised context; incomplete appointment is not fabricated',()=>{
 const a=owner(),facts=buildAgentContext(a,a.pets[0],[],'Book the groomer Friday');assert.throws(()=>proposalFromAgentResult({action:'update_event',targetId:'foreign',reply:'draft'},facts),/pending care/);
 assert.throws(()=>prepare(a,{action:'plan',petId:'stormy',data:{title:'Groomer',minutes:15}},[],now),/date and time/);
});

test('daily estimates and event deductions cannot double-consume a supply',()=>{
 const a=owner(),id=save(a,'save_inventory',{product:'Food',category:'food',unit:'g',quantity:1000,dailyUse:100,quantityAt:new Date(now).toISOString()}).resultId;
 assert.throws(()=>recurring(a,id),/daily estimates/);
 const stock=supply(a,6);recurring(a,stock);
 assert.throws(()=>save(a,'save_inventory',{id:stock,category:'other',dailyUse:1}),/Unlink/);
});
test('schedule retrieval reserves room for upcoming care after a long completed history',()=>{
 const a=owner();a.events=Array.from({length:80},(_,i)=>({id:String(i),petId:'stormy',status:'completed',startAt:new Date(now-(i+1)*86400000).toISOString()}));
 const id=recurring(a);const events=agentReadTools(a,a.pets[0],[]).execute('get_care_schedule',{}).events;
 assert.ok(events.some(e=>e.id===id));assert.equal(events.length,11);
});

test('tiny consumption cannot make account supply estimates throw on an out-of-range date',()=>{assert.doesNotThrow(()=>inventoryEstimate({quantity:10000000,dailyUse:1e-20,quantityAt:new Date(now).toISOString()},now));});

test('selective model context cannot truncate existing notes when remembering profile or care',()=>{
 const a=owner();a.pets[0].careNotes='Existing note. '.repeat(180).trim();
 assert.equal(agentReadTools(a,a.pets[0],[]).execute('get_pet_profile',{}).profile.careNotes,a.pets[0].careNotes);
 const original=a.pets[0].careNotes,facts=buildAgentContext(a,a.pets[0],[],'Update training');
 const profile=proposalFromAgentResult({action:'remember_profile',reply:'Review',training:'advanced'},facts).input;
 save(a,profile.action,profile.data);assert.equal(a.pets[0].careNotes,original);
 const memory=proposalFromAgentResult({action:'remember_care',reply:'Review',careNote:'Prefers quiet mornings.'},facts).input;
 save(a,memory.action,memory.data);assert.equal(a.pets[0].careNotes,original+'\nPrefers quiet mornings.');
});
