import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAccount,stage,decide,prepare} from '../src/domain.js';
import {agentFacts} from '../src/pet-context.js';
import {proposalFromAgentResult} from '../src/agent-actions.js';
const providers=[{id:'park',name:'Quiet Park',category:'park',address:'Brisbane'},{id:'cafe',name:'Cafe',category:'cafe',address:'Brisbane'}];
function owner(){const a=initialAccount('owner','hash');for(const name of ['Stormy','Buddy']){const p=stage(a,{action:'add_pet',data:{name,species:'Dog',social:'quiet',training:'basics'}},providers);decide(a,p.id,'confirm',providers);}return a;}
test('pet settings are confirmed, category-specific, private to the pet and survive basic edits',()=>{
 const a=owner(),pet=a.pets[0];const p=stage(a,{action:'set_pet_settings',petId:pet.id,data:{category:'walks',values:{duration:'10 minutes',frequency:'Mornings'}}},providers);
 assert.equal(pet.careSettings,undefined);decide(a,p.id,'confirm',providers);assert.equal(pet.careSettings.walks.duration,'10 minutes');assert.equal(a.pets[1].careSettings,undefined);
 const basic=stage(a,{action:'update_pet',petId:pet.id,data:{...pet,age:'4 years'}},providers);decide(a,basic.id,'confirm',providers);assert.equal(pet.careSettings.walks.frequency,'Mornings');
 const edit=stage(a,{action:'set_pet_settings',petId:pet.id,data:{category:'walks',values:{duration:'15 minutes'}}},providers);decide(a,edit.id,'confirm',providers);assert.equal(pet.careSettings.walks.frequency,'Mornings');assert.equal(pet.careSettings.walks.duration,'15 minutes');
 const clear=stage(a,{action:'set_pet_settings',petId:pet.id,data:{category:'walks',values:{duration:''}}},providers);decide(a,clear.id,'cancel',providers);assert.equal(pet.careSettings.walks.duration,'15 minutes');
 const facts=agentFacts(a,pet.id,providers);assert.equal(facts.pet.careSettings.walks.duration,'15 minutes');assert.ok(facts.settingCategories.walks.fields.duration);
});
test('invalid or stale settings cannot overwrite current care records',()=>{
 const a=owner(),pet=a.pets[0];
 for(const data of [{category:'__proto__',values:{duration:'x'}},{category:'walks',values:{bogus:'x'}},{category:'walks',values:{duration:3}},{category:'walks',values:{duration:'x'.repeat(801)}}])assert.throws(()=>prepare(a,{action:'set_pet_settings',petId:pet.id,data},providers));
 assert.throws(()=>stage(a,{action:'set_pet_settings',petId:'foreign',data:{category:'walks',values:{duration:'10 minutes'}}},providers),/your pets/);
 const first=stage(a,{action:'set_pet_settings',petId:pet.id,data:{category:'walks',values:{duration:'10 minutes'}}},providers),second=stage(a,{action:'set_pet_settings',petId:pet.id,data:{category:'walks',values:{duration:'20 minutes'}}},providers);
 decide(a,second.id,'confirm',providers);assert.throws(()=>decide(a,first.id,'confirm',providers),/changed/);assert.equal(pet.careSettings.walks.duration,'20 minutes');
});
test('favourite places require confirmation and are per pet, bounded and idempotent',()=>{
 const a=owner(),pet=a.pets[0];const p=stage(a,{action:'set_pet_place',petId:pet.id,data:{providerId:'park',saved:true}},providers);assert.equal(pet.favouritePlaceIds,undefined);decide(a,p.id,'confirm',providers);decide(a,p.id,'confirm',providers);assert.deepEqual(pet.favouritePlaceIds,['park']);assert.equal(a.pets[1].favouritePlaceIds,undefined);assert.deepEqual(a.saved,[]);
 assert.equal(agentFacts(a,pet.id,providers).favouritePlaces[0].name,'Quiet Park');assert.equal(agentFacts(a,a.pets[1].id,providers).favouritePlaces.length,0);
 assert.throws(()=>stage(a,{action:'set_pet_place',petId:pet.id,data:{providerId:'invented',saved:true}},providers),/directory/);
 const removal=stage(a,{action:'set_pet_place',petId:pet.id,data:{providerId:'park',saved:false}},providers);decide(a,removal.id,'confirm',providers);assert.deepEqual(pet.favouritePlaceIds,[]);
});
test('Pip settings and place actions map to owner review, never direct writes',()=>{
 const a=owner(),facts=agentFacts(a,a.pets[0].id,providers);
 const setting=proposalFromAgentResult({action:'set_pet_settings',reply:'Remember?',settingCategory:'dining',settingUpdates:[{field:'seating',value:'Quiet outdoor table'}]},facts);assert.equal(setting.input.petId,a.pets[0].id);const pending=stage(a,setting.input,providers);assert.equal(a.pets[0].careSettings,undefined);decide(a,pending.id,'confirm',providers);assert.equal(a.pets[0].careSettings.dining.seating,'Quiet outdoor table');
 const place=proposalFromAgentResult({action:'set_pet_place',reply:'Remember?',targetId:'cafe',placeSaved:true},facts);assert.equal(place.input.data.providerId,'cafe');assert.equal(a.pets[0].favouritePlaceIds,undefined);
 assert.throws(()=>proposalFromAgentResult({action:'set_pet_place',reply:'Oops',targetId:'foreign',placeSaved:true},facts));
});
