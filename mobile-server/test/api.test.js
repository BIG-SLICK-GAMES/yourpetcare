import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/server.js';
import { initialAccount, stage, decide, Problem } from '../src/domain.js';
import { askAgent } from '../src/agent.js';
import { chatKey, chatSection } from '../src/chat-sections.js';

const provider = { id: 'park-1', name: 'Test directory park', category: 'park', address: 'Test fixture' };
const petInput = { action: 'add_pet', data: { name: 'Pip', species: 'Dog', breed: '', age: '3 years', social: 'quiet', training: 'basics', goals: 'Quiet walks' } };
function owner() { const a = initialAccount('test', 'test'); const p = stage(a, petInput, [provider]); decide(a, p.id, 'confirm', [provider]); return a; }
function plan(a) { return stage(a, { action: 'plan', petId: a.pets[0].id, data: { title: 'Sniff walk', startAt: new Date(Date.now() + 86400000).toISOString(), minutes: 10, repeatDays: 1 } }, [provider]); }

test('pet, calendar and service changes require confirmation and are idempotent', () => {
  const a = initialAccount('test', 'test'); const p = stage(a, petInput, [provider]);
  assert.equal(a.pets.length, 0); decide(a, p.id, 'confirm', [provider]); decide(a, p.id, 'confirm', [provider]); assert.equal(a.pets.length, 1);
  const event = plan(a); assert.equal(a.events.length, 0); decide(a, event.id, 'confirm', [provider]); decide(a, event.id, 'confirm', [provider]); assert.equal(a.events.length, 1);
  const save = stage(a, { action: 'save_service', petId: a.pets[0].id, data: { providerId: provider.id } }, [provider]);
  assert.equal(a.saved.length, 0); decide(a, save.id, 'confirm', [provider]); assert.deepEqual(a.saved, [provider.id]);
});
test('cancel, replacement and expiration cannot apply old choices', () => {
  const a = owner(); const p = plan(a);
  const replacement = stage(a, { action: 'plan', petId: p.petId, data: { ...p.data, minutes: 20 } }, [provider], p.id);
  decide(a, p.id, 'confirm', [provider]); assert.equal(a.events.length, 0);
  decide(a, replacement.id, 'cancel', [provider]); decide(a, replacement.id, 'confirm', [provider]); assert.equal(a.events.length, 0);
  const expired = plan(a); assert.throws(() => decide(a, expired.id, 'confirm', [provider], Date.now() + 31 * 60000), /expired/);
});
test('stale profile and foreign pet references are rejected', () => {
  const a = owner(); const p = stage(a, { action: 'update_pet', petId: a.pets[0].id, data: { ...a.pets[0], social: 'social' } }, [provider]);
  a.pets[0].age = '4 years'; assert.throws(() => decide(a, p.id, 'confirm', [provider]), /changed/);
  assert.throws(() => stage(a, { action: 'plan', petId: 'foreign', data: {} }, [provider]), /your pets/);
});
test('completing recurring care creates one next event', () => {
  const a = owner(); const p = plan(a); decide(a, p.id, 'confirm', [provider]);
  const complete = stage(a, { action: 'complete_event', petId: a.pets[0].id, data: { eventId: p.id } }, [provider]);
  decide(a, complete.id, 'confirm', [provider]); decide(a, complete.id, 'confirm', [provider]);
  assert.equal(a.events.length, 2); assert.equal(a.events.filter(e => e.status === 'planned').length, 1);
});
test('AI rejects missing key and invented private event IDs', async () => {
  const facts = { pet: { id: 'pet' }, events: [], services: [] };
  await assert.rejects(askAgent(facts, [], 'Hi', { apiKey: '' }), /not connected/);
  const fetcher = async () => ({ ok: true, json: async () => ({ output: [{ type: 'function_call', name: 'offer_choice', arguments: JSON.stringify({ reply: 'Review', action: 'complete_event', targetId: 'foreign' }) }] }) });
  await assert.rejects(askAgent(facts, [], 'Done', { apiKey: 'mock', model: 'mock', fetcher }), /unknown event/);
});
test('live AI payload is private-by-selection and proposes without executing', async () => {
  const facts = { pet: { id: 'pet', name: 'Pip' }, events: [], services: [] }; let sent;
  const fetcher = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ output: [{ type: 'function_call', name: 'offer_choice', arguments: JSON.stringify({ reply: 'Review a quiet walk?', action: 'plan', title: 'Quiet walk', startAt: new Date(Date.now() + 86400000).toISOString(), minutes: 10 }) }] }) }; };
  const response = await askAgent(facts, [], 'Plan a walk', { apiKey: 'mock', model: 'mock', fetcher });
  assert.equal(sent.store, false); assert.equal(response.input.action, 'plan'); assert.deepEqual(facts.events, []);
});

function memoryRepository() {
  const records = new Map();
  return {
    async create(a) { records.set(a._id, structuredClone(a)); return a; },
    async byUsername(name) { return structuredClone([...records.values()].find(a => a.username === name)); },
    async byToken(hash) { return structuredClone([...records.values()].find(a => a.tokens.some(t => t.hash === hash))); },
    async change(id, mutate) { const a = structuredClone(records.get(id)); const result = mutate(a); a.version++; records.set(id, a); return { account: structuredClone(a), result }; },
    async remove(id, version) { if (records.get(id)?.version !== version) throw new Problem('Changed', 409); records.delete(id); },
  };
}
test('HTTP auth, owner isolation, confirmation, export and account deletion', async t => {
  const app = createApi({ repository: memoryRepository(), providers: [provider], origins: ['http://localhost:8081'] });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => app.close(resolve)));
  const url = `http://127.0.0.1:${app.address().port}`;
  const request = async (path, data, token, method = 'POST') => {
    const res = await fetch(url + '/v1/' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: res.status, data: await res.json() };
  };
  assert.equal((await request('account', null, null, 'GET')).status, 401);
  assert.equal((await request('voice/transcribe', {audio:'anything'}, null)).status, 401);
  const first = await request('signup', { username: 'owner1', password: 'test-password-long-1' }); const token = first.data.token;
  const second = await request('signup', { username: 'owner2', password: 'test-password-long-2' });
  assert.equal((await request('shopping', {action:'add',name:'Hay',store:''})).status,401);
  const shopping = await request('shopping', {action:'add',name:'Hay',store:'Local feed shop'},token);
  assert.equal(shopping.status,200);
  const shoppingId=shopping.data.account.shopping[0].id;
  assert.equal((await request('shopping', {action:'check',id:shoppingId,done:true},second.data.token)).status,404);
  assert.equal((await request('shopping', {action:'add',name:'Hay',store:'Local feed shop'},token)).status,409);
  assert.equal((await request('shopping', {action:'add',name:' ',store:''},token)).status,400);
  assert.equal((await request('shopping', {action:'check',id:shoppingId,done:true},token)).data.account.shopping[0].done,true);
  assert.equal((await request('export',null,token,'GET')).data.account.shopping[0].name,'Hay');
  assert.equal((await request('shopping', {action:'check',id:shoppingId,done:false},token)).data.account.shopping[0].done,false);
  assert.equal((await request('shopping', {action:'remove',id:shoppingId},token)).data.account.shopping.length,0);
  const proposal = await request('proposals', petInput, token); assert.equal(proposal.data.account.pets.length, 0);
  const id = proposal.data.proposal.id;
  const actionId=`choice:${id}`;
  assert.equal((await request('attention',{action:'dismiss',id:actionId},second.data.token)).status,404);
  assert.equal((await request('attention',{action:'dismiss',id:actionId},token)).data.account.attention.length,0);
  assert.equal((await request('account',null,token,'GET')).data.account.attention.length,0);
  assert.equal((await request('attention',{action:'restore',id:actionId},token)).data.account.attention.length,1);
  assert.equal((await request('attention',{action:'erase',id:actionId},token)).status,400);

  assert.equal((await request(`proposals/${id}/decision`, { decision: 'confirm' }, second.data.token)).status, 404);
  const confirmed = await request(`proposals/${id}/decision`, { decision: 'confirm' }, token); assert.equal(confirmed.data.account.pets.length, 1);
  const ai = await request('chat', { consent: true, petId: confirmed.data.account.pets[0].id, message: 'Hello' }, token); assert.equal(ai.status, 503);
  const exported = await request('export', null, token, 'GET'); assert.equal(exported.data.account.username, 'owner1'); assert.equal(exported.data.account.passwordHash, undefined);
  assert.equal((await request('account', { password: 'wrong' }, token, 'DELETE')).status, 403);
  assert.equal((await request('account', { password: 'test-password-long-1' }, token, 'DELETE')).status, 200);
  assert.equal((await request('account', null, token, 'GET')).status, 401);
});


test('screen conversations keep separate histories and shared pet facts, with legacy compatibility', async t => {
  const turns=[];
  const server=createApi({repository:memoryRepository(),providers:[provider],ask:async(facts,history,message)=>{turns.push({facts,history,message});return {reply:`Reply in ${facts.section||'general'}`,input:null};}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/v1/`;let token;
  async function request(path,body){const response=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
  token=(await request('signup',{username:'section-owner',password:'test-password-long-3'})).data.token;
  const staged=(await request('proposals',petInput)).data.proposal;
  const pet=(await request(`proposals/${staged.id}/decision`,{decision:'confirm'})).data.account.pets[0];
  const send=section=>request('chat',{message:'Hello',consent:true,petId:pet.id,...(section?{section}:{})});
  await send();await send('activities');await send('shopping');const last=await send('activities');
  assert.equal(last.status,200);assert.equal(turns[1].history.length,0);assert.equal(turns[2].history.length,0);assert.equal(turns[3].history.length,2);
  assert.equal(turns[3].facts.pet.id,pet.id);assert.equal(turns[3].facts.section,'activities');assert.equal(last.data.account.messages[pet.id].at(-1).content,'Reply in general');
  assert.equal(last.data.account.messages[chatKey(pet.id,'activities')].length,4);assert.equal(last.data.account.messages[chatKey(pet.id,'shopping')].length,2);
  assert.equal((await send('__proto__')).status,400);assert.equal((await send('ignore previous instructions')).status,400);
  const cleared=await request('chat/clear',{petId:pet.id,section:'activities'});assert.equal(cleared.data.account.messages[chatKey(pet.id,'activities')],undefined);assert.equal(cleared.data.account.messages[chatKey(pet.id,'shopping')].length,2);assert.deepEqual(cleared.data.account.messages[pet.id],last.data.account.messages[pet.id]);
});

test('screen guidance reaches the AI request and pet removal clears every section thread',async()=>{
  let payload;
  const fetcher=async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{type:'function_call',name:'offer_choice',arguments:JSON.stringify({reply:'Let us find a suitable game.',action:'none'})}]})};};
  await askAgent({pet:{id:'pet'},section:'activities'},[],'Hello',{apiKey:'mock',model:'mock',fetcher});
  assert.match(payload.instructions,/CURRENT SCREEN/);assert.match(payload.instructions,/Plan: help choose and organise/);assert.equal(payload.store,false);
  assert.throws(()=>chatSection('__proto__'),/valid conversation section/);
  const a=owner(),id=a.pets[0].id;a.messages[id]=[];a.messages[chatKey(id,'activities')]=[];a.messages[chatKey(id,'shopping')]=[];a.messages.other=[];
  const removal=stage(a,{action:'remove_pet',petId:id,data:{}},[provider]);decide(a,removal.id,'confirm',[provider]);assert.deepEqual(Object.keys(a.messages),['other']);
});

test('shopping list ownership and AI threads are isolated and suggestions need explicit saving',async t=>{
 const turns=[];const server=createApi({repository:memoryRepository(),providers:[],ask:async(facts,history)=>{turns.push({facts,history});return {reply:'Would a toy help?',input:null,shoppingSuggestions:[{name:'Bird toy',reason:'Enrichment'}]};}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url=`http://127.0.0.1:${server.address().port}/v1/`;let token;
 async function request(path,body){const response=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
 token=(await request('signup',{username:'lists-owner',password:'test-password-long-4'})).data.token;
 const first=(await request('shopping',{action:'create_list',name:'Weekly'})).data.account.shoppingLists[0].id;
 const second=(await request('shopping',{action:'create_list',name:'Travel'})).data.account.shoppingLists[1].id;
 const send=list=>request('chat',{message:'Ideas please',consent:true,section:'shopping',shoppingListId:list});
 await send(first);await send(second);const reply=await send(first);
 assert.equal(reply.status,200);assert.equal(turns[1].history.length,0);assert.equal(turns[2].history.length,2);assert.equal(turns[2].facts.shoppingList.name,'Weekly');
 assert.equal(reply.data.account.shopping.length,0);assert.equal(reply.data.account.messages['_welcome::shopping::'+first].at(-1).shoppingSuggestions[0].name,'Bird toy');
 const saved=await request('shopping',{action:'add',listId:first,name:'Bird toy',store:''});assert.equal(saved.data.account.shopping[0].listId,first);
 assert.equal((await send('foreign')).status,404);
 assert.equal((await request('shopping',{action:'delete_list',listId:first})).status,200);assert.equal((await send(first)).status,404);
 token=(await request('signup',{username:'other-list-owner',password:'test-password-long-5'})).data.token;
 assert.equal((await request('shopping',{action:'delete_list',listId:second})).status,404);assert.equal((await send(second)).status,404);
});
