import { Problem } from './domain.js';
import { proposalFromAgentResult } from './agent-actions.js';
export { agentFacts } from './pet-context.js';
import { companionInstructions } from './companion-instructions.js';
import { sectionInstructions } from './chat-sections.js';

export async function askAgent(facts, history, message, { apiKey, model, fetcher = fetch }) {
  if (!apiKey) throw new Problem('AI is not connected yet. You can still plan and explore using the activity buttons.', 503);
  const nullableString = { type: ['string', 'null'] };
  const properties = {
    reply: { type: 'string' }, action: { type: 'string', enum: ['none','add_pet','plan','remember_comfort','remember_profile','remember_care','set_preferred_vet','set_meal_routine','stop_meal_routine','show_walk_routes','save_service','complete_event'] },
    title: nullableString, startAt: nullableString, location: nullableString, social: nullableString,
    targetId: nullableString, minutes: { type: ['integer','null'] }, repeatDays: { type: ['integer','null'] },
    petName: nullableString, species: nullableString, age: nullableString, breed: nullableString, goals: nullableString,
    training: nullableString, careNote: nullableString, breakfastAt:nullableString, dinnerAt:nullableString,
    walkMinutes:{type:['integer','null']},walkStop:{type:['string','null'],enum:['none','rest','cafe','friends',null]},
  };
  const response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST', signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, store: false, max_output_tokens: 1800,
      instructions: companionInstructions+sectionInstructions(facts.section),
      input: [{ role: 'developer', content: JSON.stringify(facts) }, ...history.slice(-20).map(({role,content})=>({role,content})), { role: 'user', content: message }],
      tools: [{ type: 'function', name: 'offer_choice', description: 'Reply and optionally offer one change for owner review. Does not execute it.', strict: true,
        parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } }],
      tool_choice: { type: 'function', name: 'offer_choice' }, parallel_tool_calls: false,
    }),
  });
  if (!response.ok) throw new Problem('AI could not respond. No changes were made. Please try again.', 503);
  const body = await response.json();
  const calls = (body.output ?? []).filter(item => item?.type === 'function_call' && item.name === 'offer_choice');
  if (calls.length !== 1) throw new Problem('AI returned an unsupported response. No changes were made.', 503);
  let result;
  try { result = JSON.parse(calls[0].arguments); } catch { throw new Problem('AI could not prepare a response.', 503); }
  if (!result || typeof result.reply !== 'string' || !properties.action.enum.includes(result.action)) throw new Problem('AI returned an unsupported choice.', 503);
  return proposalFromAgentResult(result, facts);
}
