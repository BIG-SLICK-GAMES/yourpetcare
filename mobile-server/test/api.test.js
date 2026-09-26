import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/server.js';
import { initialAccount, stage, decide, Problem } from '../src/domain.js';
import { askAgent } from '../src/agent.js';

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
  const first = await request('signup', { username: 'owner1', password: 'test-password-long-1' }); const token = first.data.token;
  const second = await request('signup', { username: 'owner2', password: 'test-password-long-2' });
  const proposal = await request('proposals', petInput, token); assert.equal(proposal.data.account.pets.length, 0);
  const id = proposal.data.proposal.id;
  assert.equal((await request(`proposals/${id}/decision`, { decision: 'confirm' }, second.data.token)).status, 404);
  const confirmed = await request(`proposals/${id}/decision`, { decision: 'confirm' }, token); assert.equal(confirmed.data.account.pets.length, 1);
  const ai = await request('chat', { consent: true, petId: confirmed.data.account.pets[0].id, message: 'Hello' }, token); assert.equal(ai.status, 503);
  const exported = await request('export', null, token, 'GET'); assert.equal(exported.data.account.username, 'owner1'); assert.equal(exported.data.account.passwordHash, undefined);
  assert.equal((await request('account', { password: 'wrong' }, token, 'DELETE')).status, 403);
  assert.equal((await request('account', { password: 'test-password-long-1' }, token, 'DELETE')).status, 200);
  assert.equal((await request('account', null, token, 'GET')).status, 401);
});
