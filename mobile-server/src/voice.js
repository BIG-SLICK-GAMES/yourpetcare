import { Problem } from './domain.js';

export async function transcribeAudio(body, { apiKey, transcriptionModel = 'gpt-transcribe', fetcher = fetch }) {
  if (!apiKey) throw new Problem('Voice is waiting for the AI connection.', 503);
  if (body.consent !== true) throw new Problem('Allow voice sharing before sending a recording.');
  const formats = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/m4a': 'm4a', 'audio/wav': 'wav' };
  const extension = formats[body.mimeType];
  if (!extension || typeof body.audio !== 'string' || body.audio.length > 5600000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio)) throw new Problem('Use a short audio recording.', 413);
  const bytes = Buffer.from(body.audio, 'base64');
  if (bytes.length < 100 || bytes.length > 4 * 1024 * 1024) throw new Problem('Record up to 30 seconds of speech.');
  const form = new FormData();
  form.set('model', transcriptionModel);
  form.set('file', new Blob([bytes], { type: body.mimeType }), `voice.${extension}`);
  const response = await fetcher('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Problem('Could not hear that recording. Try again or type instead.', 503);
  const result = await response.json();
  if (typeof result.text !== 'string' || !result.text.trim()) throw new Problem('No speech heard. Try again.');
  if (result.text.length > 1500) throw new Problem('That was a little long. Try a shorter message.');
  return { text: result.text.trim() };
}
