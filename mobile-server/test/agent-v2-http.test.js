import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from '../src/server.js';
import {initialAccount,stage,decide,Problem} from '../src/domain.js';
import {createHash} from 'node:crypto';

test('V2 HTTP: scoped context, refreshed proposal, section receipt, exactly-once action and audit export',async t=>{
 const token='b'.repeat(64),a=initialAccount('qa','private'),hash=createHash('sha256').update(token).digest('hex');a.tokens=[{hash,expires:Date.now()+60000}];a.pets=[{id:'s',name:'Stormy',species:'Dog',social:'quiet',training:'basics'},{id:'l',name:'Luna',species:'Cat',careNotes:'Luna secret'}];
 let p=stage(a,{action:'plan',petId:'s',data:{title:'Worming',startAt:new Date(Date.now()+86400000).toISOString(),minutes:5,repeatDays:7}},[]);decide(a,p.id,'confirm',[]);
 let record=structuredClone(a),modelCalls=0;
 const repo={byToken:async h=>h===hash?structuredClone(record):null,change:async(id,fn)=>{if(id!==record._id)throw new Problem('Not found',404);const copy=structuredClone(record),result=fn(copy);record=copy;return {account:copy,result};}};
 const ask=async(facts,history)=>{modelCalls++;assert.ok(!JSON.stringify(facts).includes('Luna secret'));assert.equal(facts.pet.id,'s');return {reply:'Review completing the recorded care.',input:{action:'complete_event',petId:'s',data:{eventId:a.events[0].id}}};};
 const server=createApi({repository:repo,providers:[],agentV2:true,ask});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const request=async(path,data)=>{const res=await fetch(`http://127.0.0.1:${server.address().port}/v1/${path}`,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});assert.equal(res.status,200);return res.json();};
 await request('chat',{petId:'s',message:"When's Stormy's worming?",consent:true});assert.equal(modelCalls,0);
 const draft=await request('chat',{petId:'s',section:'calendar',message:'Stormy got wormed today.',consent:true});assert.equal(record.events[0].status,'planned');assert.equal((await request('account')).account.proposals[0].id,draft.proposal.id);
 const response=await request('proposals/'+draft.proposal.id+'/decision',{decision:'confirm'});assert.equal(response.account.events.length,2);assert.match(response.account.messages['s::calendar'].at(-1).content,/Recorded/);
 await request('proposals/'+draft.proposal.id+'/decision',{decision:'confirm'});assert.equal(record.events.length,2);assert.equal(record.messages['s::calendar'].length,3);
 const exported=await request('export');assert.ok(exported.account.audit.find(x=>x.id===draft.proposal.id).before);assert.equal(exported.account.passwordHash,undefined);
});
