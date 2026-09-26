import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { Problem } from './domain.js';

export function aiSettings(repository, encryptionKey, defaults) {
  const key = /^[a-f0-9]{64}$/i.test(encryptionKey || '') ? Buffer.from(encryptionKey, 'hex') : null;
  const publicView = row => ({ configured: !!row?.sealedKey || (!row && !!defaults.apiKey), model: row?.model || defaults.model, storageReady: !!key });
  return {
    async status() { return publicView(await repository.getAiSettings()); },
    async load() {
      const row = await repository.getAiSettings();
      if (!row) return defaults;
      if (!row.sealedKey) return { ...defaults, apiKey: '' };
      if (!key) throw new Problem('AI key storage is unavailable.', 503);
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(row.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(row.tag, 'hex'));
      const apiKey = Buffer.concat([decipher.update(Buffer.from(row.sealedKey, 'hex')), decipher.final()]).toString('utf8');
      return { ...defaults, apiKey, model: row.model };
    },
    async save(body, admin) {
      if (!key) throw new Problem('Private key storage must be configured on the server first.', 503);
      const model = body.model || defaults.model;
      if (typeof model !== 'string' || !/^[a-zA-Z0-9._-]{2,100}$/.test(model)) throw new Problem('Enter a valid model name.');
      const row = { model, updatedAt: new Date().toISOString(), updatedBy: admin.id };
      if (body.remove !== true) {
        if (typeof body.apiKey !== 'string' || !/^sk-[A-Za-z0-9_-]{16,500}$/.test(body.apiKey.trim())) throw new Problem('Enter an OpenAI API key.');
        const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
        row.sealedKey = Buffer.concat([cipher.update(body.apiKey.trim(), 'utf8'), cipher.final()]).toString('hex');
        row.iv = iv.toString('hex'); row.tag = cipher.getAuthTag().toString('hex');
      }
      await repository.setAiSettings(row);
      return publicView(row);
    },
    async test(fetcher = fetch) {
      const config = await this.load();
      if (!config.apiKey) throw new Problem('Save an API key first.');
      let response;
      try { response = await fetcher('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, input: 'Reply with the single word Ready.', max_output_tokens: 128, store: false }), signal: AbortSignal.timeout(25000) }); }
      catch { throw new Problem('Could not reach OpenAI. Try again.', 503); }
      if (!response.ok) throw new Problem('OpenAI rejected the connection. Check the key, model access and API billing.', 503);
      await response.arrayBuffer();
      return { ok: true };
    },
  };
}
