import { attentionItems } from './attention.js';
import { createSupplyFeeds, publicSupplySources } from './supplies.js';
import http from 'node:http';
import { changeShopping } from './shopping.js';
import { isIP } from 'node:net';
import { randomBytes, createHash, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Problem, initialAccount, accountView, stage, decide, species } from './domain.js';
import { agentFacts, askAgent } from './agent.js';
import { adminVerifier, adminSummary, setAccountAccess } from './admin.js';
import { aiSettings } from './ai-settings.js';
import { transcribeAudio } from './voice.js';
import { walkingRoutes } from './walking-routes.js';
import { nearbyOutings } from './outings.js';

const scrypt = promisify(rawScrypt);
const hash = value => createHash('sha256').update(value).digest('hex');
export async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}
export async function passwordMatches(password, stored) {
  const [salt, key] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  return actual.length === Buffer.from(key, 'hex').length && timingSafeEqual(actual, Buffer.from(key, 'hex'));
}

export function createApi({ repository, providers, apiKey = '', model = 'gpt-6-sol', origins = [], ask = askAgent, verifyAdmin = adminVerifier(''), settings, transcribe = transcribeAudio }) {
  const loadAI = () => settings ? settings.load() : Promise.resolve({ apiKey, model });
  const limits = new Map();
  const supplyOffers=createSupplyFeeds();
  function throttle(key, count, windowMs) {
    const now = Date.now(), recent = (limits.get(key) ?? []).filter(t => now - t < windowMs);
    if (recent.length >= count) throw new Problem('Please wait a little before trying again.', 429);
    limits.set(key, [...recent, now]);
    if (limits.size > 10000) for (const [k, times] of limits) if (now - times.at(-1) > 3600000) limits.delete(k);
  }
  return http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (body, status = 200) => { res.statusCode = status; res.end(JSON.stringify(body)); };
    try {
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin)) throw new Problem('This website is not allowed to access the API.', 403);
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS'); res.statusCode = 204; return res.end();
      }
      const path = new URL(req.url, 'http://localhost').pathname;
      const route = `${req.method} ${path}`;
      if (route === 'POST /v1/voice/transcribe') {
        const voiceToken = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
        const owner = voiceToken && await repository.byToken(hash(voiceToken));
        if (!owner || owner.disabled || !owner.tokens.some(t => t.hash === hash(voiceToken) && t.expires > Date.now())) throw new Problem('Sign in to use voice.', 401);
        throttle(`voice:${owner._id}`, 8, 60000);
      }
      let text = '', bytes = 0;
      const maxBytes = route === 'POST /v1/voice/transcribe' ? 5700000 : 32768;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > maxBytes) throw new Problem('This request is too large.', 413); text += chunk; }
      let body = {};
      if (text) { try { body = JSON.parse(text); } catch { throw new Problem('Send valid JSON.'); } }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Problem('Send an object.');
      if (route === 'GET /v1/health') return send({ ok: true, name: 'Your Pet Care mobile API' });
      if (route === 'POST /v1/walk-routes') { throttle('walking-global',1,1100); return send(await walkingRoutes(body)); }
      if (route === 'POST /v1/outing-stops') return send(await nearbyOutings(body));
      if (route === 'GET /v1/supply-offers') { throttle('supplies-global',120,60000); return send(await supplyOffers(new URL(req.url,'http://localhost').searchParams.get('store'))); }
      if (route === 'GET /v1/catalog') return send({ providers, species, supplyStores:publicSupplySources, aiAvailable: !!(await loadAI()).apiKey, weatherAvailable: false, crowdsAvailable: false });
      if (path.startsWith('/v1/admin/')) {
        const admin = await verifyAdmin(req.headers.authorization);
        if (route.startsWith('GET /v1/admin/ai') || route.startsWith('POST /v1/admin/ai')) {
          if (!settings) throw new Problem('AI settings are not configured.', 503);
          if (route === 'GET /v1/admin/ai') return send(await settings.status());
          if (route === 'POST /v1/admin/ai') return send(await settings.save(body, admin));
          if (route === 'POST /v1/admin/ai/test') return send(await settings.test());
        }
        if (route === 'GET /v1/admin/accounts') {
          const url = new URL(req.url, 'http://localhost');
          const search = (url.searchParams.get('search') || '').trim().toLowerCase();
          if (search.length > 40) throw new Problem('Search is too long.');
          const page = Math.max(0, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '0', 10) || 0));
          return send({ admin, ...(await repository.listAccounts(search, page)) });
        }
        const match = /^POST \/v1\/admin\/accounts\/([a-zA-Z0-9-]+)\/access$/.exec(route);
        if (match) {
          const result = await repository.change(match[1], a => setAccountAccess(a, body, admin), { admin: true });
          return send({ account: adminSummary(result.account) });
        }
        throw new Problem('Not found.', 404);
      }
      if (['POST /v1/signup', 'POST /v1/login'].includes(route)) {
        // Apache appends the actual connecting client to X-Forwarded-For.
        // Trust only its final entry, and only when the socket is loopback.
        const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim();
        const localProxy = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
        throttle(`auth:${localProxy && isIP(forwarded) ? forwarded : req.socket.remoteAddress}`, 15, 15 * 60000);
        const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
        const password = body.password;
        if (!/^[a-z0-9_.-]{3,40}$/.test(username) || typeof password !== 'string' || password.length < 12 || password.length > 200) throw new Problem('Use a username of 3–40 letters/numbers and a password of at least 12 characters.');
        let account = await repository.byUsername(username);
        if (route === 'POST /v1/signup') {
          if (account) throw new Problem('That username is unavailable.', 409);
          account = await repository.create(initialAccount(username, await passwordHash(password)));
        } else if (!account || !await passwordMatches(password, account.passwordHash)) throw new Problem('Check your username and password.', 401);
        if (account.disabled) throw new Problem('This account is suspended. Contact support.', 403);
        const token = randomBytes(32).toString('hex');
        const { account: next } = await repository.change(account._id, a => { a.tokens = [...a.tokens.filter(t => t.expires > Date.now()).slice(-9), { hash: hash(token), expires: Date.now() + 30 * 86400000 }]; });
        return send({ token, account: accountView(next) });
      }
      const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1];
      const tokenHash = token && hash(token);
      const account = tokenHash && await repository.byToken(tokenHash);
      if (!account || !account.tokens.some(t => t.hash === tokenHash && t.expires > Date.now())) throw new Problem('Sign in to save and chat about your pets.', 401);
      if (account.disabled) throw new Problem('This account is suspended. Contact support.', 403);
      if (route === 'POST /v1/voice/transcribe') return send(await transcribe(body, await loadAI()));
      if (route === 'GET /v1/account') return send({ account: accountView(account) });
      if (route === 'GET /v1/export') return send({ exportedAt: new Date().toISOString(), account: accountView(account) });
      if (route === 'POST /v1/logout') { await repository.change(account._id, a => { a.tokens = a.tokens.filter(t => t.hash !== tokenHash); }); return send({ ok: true }); }
      if (route === 'DELETE /v1/account') {
        if (typeof body.password !== 'string' || body.password.length > 200 || !await passwordMatches(body.password, account.passwordHash)) throw new Problem('Enter your password to delete this account.', 403);
        await repository.remove(account._id, account.version); return send({ ok: true });
      }
      if (route === 'POST /v1/attention') {
        if (typeof body.id !== 'string' || body.id.length > 200 || !['dismiss','restore'].includes(body.action)) throw new Problem('Choose a dashboard action.');
        const result = await repository.change(account._id, a => {
          const current = attentionItems(a).map(item=>item.id);
          if (!current.includes(body.id)) throw new Problem('That action is no longer waiting.',404);
          const dismissed = (a.dismissedAttention||[]).filter(id=>current.includes(id)&&id!==body.id);
          a.dismissedAttention = body.action==='dismiss' ? [...dismissed,body.id] : dismissed;
        });
        return send({account:accountView(result.account)});
      }
      if (route === 'POST /v1/shopping') {
        throttle(`shopping:${account._id}`, 60, 60000);
        const result = await repository.change(account._id, a => changeShopping(a, body));
        return send({ account: accountView(result.account) });
      }
      if (route === 'POST /v1/proposals') {
        throttle(`proposals:${account._id}`, 30, 60000);
        const result = await repository.change(account._id, a => stage(a, body, providers, body.replaceId));
        return send({ proposal: result.result, account: accountView(result.account) }, 201);
      }
      if (/^POST \/v1\/proposals\/[^/]+\/decision$/.test(route)) {
        const id = path.split('/')[3];
        const result = await repository.change(account._id, a => {
          const pending=a.proposals.find(p=>p.id===id)?.status==='pending';
          const proposal=decide(a,id,body.decision,providers);
          if(pending&&proposal.report){const key=proposal.action==='add_pet'&&proposal.status==='confirmed'?proposal.resultId:proposal.petId||'_welcome';a.messages[key]=[...(a.messages[key]||[]),{role:'assistant',content:proposal.report}].slice(-20);}
          return proposal;
        });
        return send({ proposal: result.result, account: accountView(result.account) });
      }
      if (route === 'POST /v1/chat/clear') {
        const result = await repository.change(account._id, a => { if (body.petId && !a.pets.some(p => p.id === body.petId)) throw new Problem('Pet not found.', 404); delete a.messages[body.petId || '_welcome']; });
        return send({ account: accountView(result.account) });
      }
      if (route === 'POST /v1/chat') {
        if (body.consent !== true) throw new Problem('Choose whether to share this chat and pet context with AI.');
        if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1500) throw new Problem('Write a message of up to 1,500 characters.');
        throttle(`ai:${account._id}`, 8, 60000);
        const facts = agentFacts(account, body.petId, providers);
        if (typeof body.timezone === 'string' && body.timezone.length < 100) {
          try { new Intl.DateTimeFormat('en', { timeZone: body.timezone }); facts.timezone = body.timezone; } catch { throw new Problem('Choose a valid timezone.'); }
        }
        const messageKey = facts.pet?.id || '_welcome';
        if (body.replaceId) {
          const previous = account.proposals.find(p => p.id === body.replaceId && p.status === 'pending' && Date.parse(p.expiresAt) > Date.now());
          if (!previous || (previous.petId && previous.petId !== facts.pet?.id)) throw new Problem('That choice is no longer available.', 409);
          facts.currentProposal = previous;
        }
        const response = await ask(facts, account.messages[messageKey] ?? [], body.message, await loadAI());
        const result = await repository.change(account._id, a => {
          if (!facts.pet && a.pets.length !== account.pets.length) throw new Problem('Your pets changed. Please try again.', 409);
          if (JSON.stringify(a.pets.find(p => p.id === body.petId) || null) !== JSON.stringify(facts.pet)) throw new Problem('The pet profile changed while AI was replying. Please send your message again.', 409);
          const proposal = response.input ? stage(a, response.input, providers, body.replaceId) : null;
          a.messages[messageKey] = [...(a.messages[messageKey] ?? []), { role: 'user', content: body.message }, { role: 'assistant', content: response.reply, ...(response.navigation?{navigation:response.navigation}:{}) }].slice(-20);
          return proposal;
        });
        return send({ reply: response.reply, proposal: result.result, account: accountView(result.account) });
      }
      throw new Problem('Not found.', 404);
    } catch (error) {
      // Never log request bodies, credentials or private pet context.
      send({ error: error instanceof Problem ? error.message : 'The service could not complete this request. Please try again.' }, error instanceof Problem ? error.status : 503);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectRepository } = await import('./repository.js');
  const repository = await connectRepository(process.env.YPC_MONGODB_URI, process.env.YPC_MONGODB_DATABASE || 'yourpetcare');
  const providers = JSON.parse(await readFile(new URL('../data/providers.json', import.meta.url)));
  const settings = aiSettings(repository, process.env.YPC_KEY_ENCRYPTION_KEY, { apiKey: process.env.YPC_OPENAI_API_KEY || '', model: process.env.YPC_COMPANION_MODEL || 'gpt-6-sol', transcriptionModel: process.env.YPC_TRANSCRIPTION_MODEL || 'gpt-transcribe' });
  const app = createApi({ repository, providers, settings, origins: (process.env.YPC_WEB_ORIGINS || '').split(',').filter(Boolean), verifyAdmin: adminVerifier(process.env.YPC_ADMIN_PROFILE_URL) });
  app.listen(Number(process.env.PORT || 3060), process.env.HOST || '127.0.0.1', () => console.log('Your Pet Care mobile API ready'));
  for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => app.close(async () => { await repository.close(); process.exit(0); }));
}
