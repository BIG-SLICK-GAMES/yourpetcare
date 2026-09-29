import test from 'node:test';
import assert from 'node:assert/strict';
import {initialAccount} from '../src/domain.js';
import {activeTask,rememberTask,taskState} from '../src/pip-task.js';
test('task memory is scoped, bounded, expires and uses actual confirmation state',()=>{
 const a=initialAccount('a','hash'),b=initialAccount('b','hash'),now=Date.now();
 const note={task:'Replace food',knownDetails:'15kg usual food',missingDetails:'suburb',proposedAction:'Compare prices'};
 const p={id:'proposal',status:'pending',expiresAt:new Date(now+10000).toISOString()};a.proposals.push(p);
 rememberTask(a,'stormy::shopping::essentials',note,'stormy',p,now);
 assert.equal(activeTask(a,'stormy::shopping::essentials',now).confirmationStatus,'pending');
 assert.equal(activeTask(a,'other::shopping::essentials',now),null);assert.equal(activeTask(b,'stormy::shopping::essentials',now),null);
 assert.equal(activeTask(a,'stormy::shopping::essentials',now+11000).confirmationStatus,'expired');
 p.status='confirmed';assert.equal(activeTask(a,'stormy::shopping::essentials',now).confirmationStatus,'confirmed');
 assert.equal(activeTask(a,'stormy::shopping::essentials',now+8*86400000),null);
 assert.throws(()=>taskState({...note,knownDetails:'x'.repeat(601)}));assert.throws(()=>taskState({...note,confirmationStatus:'confirmed'}));
 rememberTask(a,'stormy::shopping::essentials',null,'stormy',null,now);assert.equal(activeTask(a,'stormy::shopping::essentials',now),null);
});
