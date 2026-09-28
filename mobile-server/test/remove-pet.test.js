import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAccount,stage,decide} from '../src/domain.js';
function fixture(){const a=initialAccount('owner','hash');a.pets=[{id:'one',name:'Stormy'},{id:'two',name:'Luna'}];a.events=[{id:'meal',petId:'one',status:'planned'},{id:'other',petId:'two',status:'planned'}];a.messages={one:[{content:'Private chat'}],two:[{content:'Keep me'}]};a.saved=['park'];return a;}
test('pet removal requires confirmation, clears only that pet, and is idempotent',()=>{
 const a=fixture();const cancelled=stage(a,{action:'remove_pet',petId:'one',data:{}},[]);decide(a,cancelled.id,'cancel',[]);assert.equal(a.pets.length,2);assert.equal(a.events.length,2);
 const stale=stage(a,{action:'remove_pet',petId:'one',data:{}},[]),p=stage(a,{action:'remove_pet',petId:'one',data:{}},[]);assert.equal(a.pets.length,2);
 decide(a,p.id,'confirm',[]);decide(a,p.id,'confirm',[]);assert.deepEqual(a.pets.map(p=>p.id),['two']);assert.deepEqual(a.events.map(e=>e.id),['other']);assert.deepEqual(a.messages,{two:[{content:'Keep me'}]});assert.deepEqual(a.saved,['park']);assert.equal(a.proposals.some(p=>p.id===stale.id),false);assert.equal(p.before,null);assert.match(p.report,/Removed Stormy/);
 const last=stage(a,{action:'remove_pet',petId:'two',data:{}},[]);decide(a,last.id,'confirm',[]);assert.deepEqual(a.pets,[]);assert.deepEqual(a.events,[]);assert.deepEqual(a.messages,{});
});
test('foreign, expired and stale removals cannot delete a pet',()=>{
 const a=fixture();assert.throws(()=>stage(a,{action:'remove_pet',petId:'foreign',data:{}},[]));
 const p=stage(a,{action:'remove_pet',petId:'one',data:{}},[]);assert.throws(()=>decide(a,p.id,'confirm',[],Date.parse(p.expiresAt)+1));
 a.events.push({id:'new',petId:'one'});assert.throws(()=>decide(a,p.id,'confirm',[]),/changed/);assert.equal(a.pets.length,2);
 const changed=stage(a,{action:'remove_pet',petId:'one',data:{}},[]);a.pets[0].name='Updated';assert.throws(()=>decide(a,changed.id,'confirm',[]),/changed/);assert.equal(a.pets.length,2);
});
