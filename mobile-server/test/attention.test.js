import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionItems } from '../src/attention.js';
import { initialAccount, accountView, stage, decide } from '../src/domain.js';

test('badges count due care and pending choices, not incomplete profiles or future events',()=>{
  const now=Date.now(),a=initialAccount('test','test');a.pets=[{id:'stormy'}];
  a.events=[{id:'due',petId:'stormy',title:'Breakfast',status:'planned',startAt:new Date(now-3600000).toISOString(),repeatDays:1},{id:'future',petId:'stormy',status:'planned',startAt:new Date(now+3600000).toISOString()}];
  assert.equal(attentionItems(a,now).length,1);
  const id=attentionItems(a,now)[0].id;a.dismissedAttention=[id];
  assert.equal(accountView(a).attention.length,0);assert.equal(a.events[0].status,'planned');
  assert.notEqual(attentionItems(a,now+86400000).find(i=>i.targetId==='due').id,id);
  a.proposals=[{id:'review',petId:'stormy',status:'pending',action:'complete_event',summary:'Complete breakfast',data:{eventId:'due'},expiresAt:new Date(now+60000).toISOString()}];
  assert.equal(attentionItems(a,now).length,1);assert.equal(attentionItems(a,now)[0].kind,'choice');
  assert.equal(attentionItems(a,now+60001)[0].kind,'event');
});

test('finishing an overdue routine schedules its next future occurrence without old badge backlog',()=>{
  const now=Date.now(),a=initialAccount('test','test');a.pets=[{id:'stormy',name:'Stormy'}];
  a.events=[{id:'due',petId:'stormy',title:'Breakfast',status:'planned',startAt:new Date(now-3*86400000-3600000).toISOString(),repeatDays:1}];
  const p=stage(a,{action:'complete_event',petId:'stormy',data:{eventId:'due'}},[]);
  decide(a,p.id,'confirm',[],now);
  assert.equal(attentionItems(a,now).length,0);
  assert.equal(Date.parse(a.events[1].startAt),now+86400000-3600000);
});
