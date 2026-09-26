import { Problem } from './domain.js';

// Delegate verification to the existing admin service on every request. Its
// middleware checks the JWT, current stored token, role and blocked/deleted state.
export function adminVerifier(profileUrl, fetcher = fetch) {
  return async authorization => {
    if (!profileUrl || typeof authorization !== 'string' || authorization.length > 4096 || !authorization) throw new Problem('Sign in through the 21 Holdem admin.', 401);
    let response;
    try { response = await fetcher(profileUrl, { headers: { authorization }, redirect: 'error', signal: AbortSignal.timeout(5000) }); }
    catch { throw new Problem('Admin verification is unavailable. Please try again.', 503); }
    if (!response.ok) throw new Problem('Your admin session is not valid. Sign in again.', 403);
    const body = await response.json();
    if (body?.data?.eUserType !== 'admin' || typeof body.data._id !== 'string') throw new Problem('Administrator access is required.', 403);
    return { id: body.data._id, name: body.data.sUserName || 'Administrator' };
  };
}

export function adminSummary(account) {
  return { id: account._id, username: account.username, createdAt: account.createdAt, disabled: account.disabled === true, pets: account.pets.length, events: account.events.length };
}

export function setAccountAccess(account, body, admin) {
  if (typeof body.disabled !== 'boolean' || typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.length > 300) throw new Problem('Choose an account status and provide a short reason.');
  if (body.expectedDisabled !== (account.disabled === true)) throw new Problem('This account changed. Refresh before trying again.', 409);
  account.disabled = body.disabled;
  account.tokens = [];
  account.adminAudit = [...(account.adminAudit || []), { at: new Date().toISOString(), adminId: admin.id, action: body.disabled ? 'suspend' : 'restore', reason: body.reason.trim() }];
  return adminSummary(account);
}
