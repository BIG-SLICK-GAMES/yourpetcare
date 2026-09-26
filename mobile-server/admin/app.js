const el = id => document.getElementById(id);
let page = 0, selected = null, busy = false, search = '';
async function api(path, body) {
  // Same origin as the existing admin; no token is sent in a URL or copied to
  // another browser storage location. Re-read it to respect logout/login.
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) { el('login').hidden = false; throw new Error('Sign in using your existing admin account.'); }
  const response = await fetch('/pet-care-api/v1/admin/' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok) { if ([401,403].includes(response.status)) { el('login').hidden = false; el('workspace').hidden = true; } throw new Error(result.error || 'Please try again.'); }
  return result;
}
async function load() {
  el('error').textContent = '';
  try {
    const data = await api(`accounts?page=${page}&search=${encodeURIComponent(search)}`);
    el('identity').textContent = `Signed in as ${data.admin.name}`;
    el('workspace').hidden = false; el('login').hidden = true;
    el('count').textContent = `${data.total} users · Page ${page + 1}`;
    el('users').replaceChildren();
    for (const user of data.accounts) {
      const row = document.createElement('tr');
      for (const text of [user.username, user.pets, user.events, user.disabled ? 'Suspended' : 'Active']) { const cell = document.createElement('td'); cell.textContent = text; row.append(cell); }
      const cell = document.createElement('td'), button = document.createElement('button');
      button.textContent = user.disabled ? 'Restore' : 'Suspend';
      button.addEventListener('click', () => { selected = user; el('reason').value = ''; el('choice').textContent = `${user.disabled ? 'Restore' : 'Suspend'} ${user.username}?`; el('confirm').showModal(); });
      cell.append(button); row.append(cell); el('users').append(row);
    }
    el('previous').disabled = page === 0; el('next').disabled = (page + 1) * 25 >= data.total;
  } catch (error) { el('error').textContent = error.message; el('identity').textContent = 'User management unavailable'; }
}
el('search-form').addEventListener('submit', e => { e.preventDefault(); search = el('search').value.trim(); page = 0; void load(); });
el('previous').onclick = () => { page--; void load(); };
el('next').onclick = () => { page++; void load(); };
el('cancel').onclick = () => el('confirm').close();
el('access-form').addEventListener('submit', async e => {
  e.preventDefault(); if (busy || !selected) return;
  busy = true; el('save').disabled = true; el('cancel').disabled = true;
  try { await api(`accounts/${selected.id}/access`, { disabled: !selected.disabled, expectedDisabled: selected.disabled, reason: el('reason').value }); el('confirm').close(); await load(); }
  catch (error) { el('confirm').close(); el('error').textContent = error.message; }
  finally { busy = false; el('save').disabled = false; el('cancel').disabled = false; }
});
async function aiStatus() {
  try { const status = await api('ai'); el('ai-status').textContent = status.configured ? 'Key saved. Use Test connection to check it.' : 'No API key saved.'; el('ai-model').value = status.model; el('ai-save').disabled = !status.storageReady; }
  catch(error) { el('ai-status').textContent = error.message; }
}
async function aiAction(action) {
  for(const id of ['ai-save','ai-test','ai-remove']) el(id).disabled=true;
  try { await action(); } catch(error) { el('ai-status').textContent=error.message; }
  finally { for(const id of ['ai-save','ai-test','ai-remove']) el(id).disabled=false; el('api-key').value=''; }
}
el('ai-form').addEventListener('submit', e => { e.preventDefault(); void aiAction(async()=>{const apiKey=el('api-key').value;el('api-key').value='';await api('ai',{apiKey,model:el('ai-model').value});await aiStatus();}); });
el('ai-test').onclick=()=>void aiAction(async()=>{el('ai-status').textContent='Testing…';await api('ai/test',{});el('ai-status').textContent='Connected. Your pet companion is ready.';});
el('ai-remove').onclick=()=>{if(confirm('Remove the AI key and turn off live conversations?'))void aiAction(async()=>{await api('ai',{remove:true});await aiStatus();});};
void load().then(()=>{if(!el('workspace').hidden)void aiStatus();});
