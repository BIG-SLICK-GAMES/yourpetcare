import test from 'node:test';
import assert from 'node:assert/strict';
import { adminVerifier, adminSummary, setAccountAccess } from '../src/admin.js';
import { initialAccount } from '../src/domain.js';
import { createApi } from '../src/server.js';

test('existing admin verification fails closed for missing, revoked and non-admin sessions', async () => {
  await assert.rejects(adminVerifier('')('token'), /Sign in/);
  await assert.rejects(adminVerifier('http://admin', async () => ({ ok: false }))('revoked'), /not valid/);
  await assert.rejects(adminVerifier('http://admin', async () => ({ ok: true, json: async () => ({ data: { _id: 'user', eUserType: 'user' } }) }))('owner'), /Administrator/);
  let calls = 0;
  const verify = adminVerifier('http://admin', async (_, options) => { calls++; assert.equal(options.headers.authorization, 'staff-token'); return { ok: true, json: async () => ({ data: { _id: 'staff', eUserType: 'admin', sUserName: 'Manager' } }) }; });
  assert.deepEqual(await verify('staff-token'), { id: 'staff', name: 'Manager' });
  await verify('staff-token'); assert.equal(calls, 2);
});

test('account suspension revokes sessions, records actor and rejects stale changes', () => {
  const account = initialAccount('owner', 'private'); account.tokens = [{ hash: 'private' }];
  const result = setAccountAccess(account, { disabled: true, expectedDisabled: false, reason: 'Owner request' }, { id: 'staff' });
  assert.equal(result.disabled, true); assert.deepEqual(account.tokens, []);
  assert.equal(account.adminAudit[0].adminId, 'staff');
  assert.equal(adminSummary(account).passwordHash, undefined);
  assert.throws(() => setAccountAccess(account, { disabled: false, expectedDisabled: false, reason: 'Wrong state' }, { id: 'staff' }), /changed/);
  setAccountAccess(account, { disabled: false, expectedDisabled: true, reason: 'Resolved' }, { id: 'staff' });
  assert.equal(account.disabled, false); assert.equal(account.adminAudit.length, 2);
});

test('admin HTTP routes reject owner tokens and never return private account fields', async t => {
  const account = initialAccount('owner', 'private');
  const repository = { listAccounts: async () => ({ accounts: [adminSummary(account)], total: 1, page: 0 }), change: async (_, mutate, options) => { assert.equal(options.admin, true); mutate(account); return { account }; } };
  const verifyAdmin = adminVerifier('http://admin', async (_, options) => ({ ok: options.headers.authorization === 'staff-token', json: async () => ({ data: { _id: 'staff', eUserType: 'admin' } }) }));
  const app = createApi({ repository, providers: [], verifyAdmin });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => app.close(resolve)));
  const base = `http://127.0.0.1:${app.address().port}/v1/admin/accounts`;
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await fetch(base, { headers: { authorization: 'Bearer owner-token' } })).status, 403);
  const response = await fetch(base, { headers: { authorization: 'staff-token' } });
  const result = await response.json(); assert.equal(result.accounts[0].username, 'owner'); assert.equal(JSON.stringify(result).includes('private'), false);
  const update = await fetch(base + '/' + account._id + '/access', { method: 'POST', headers: { authorization: 'staff-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ disabled: true, expectedDisabled: false, reason: 'Review requested' }) });
  assert.equal(update.status, 200); assert.equal(account.disabled, true);
});
