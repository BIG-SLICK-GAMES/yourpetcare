import { Problem } from './domain.js';
import { proposalFromAgentResult } from './agent-actions.js';
export { agentFacts } from './pet-context.js';
import { companionInstructions } from './companion-instructions.js';
import { sectionInstructions } from './chat-sections.js';

export async function askAgent(facts, history, message, { apiKey, model, fetcher = fetch }) {
  if (!apiKey) throw new Problem('AI is not connected yet. You can still plan and explore using the activity buttons.', 503);
  const nullableString = { type: ['string', 'null'] };
  const properties = {
    shoppingSuggestions:{type:['array','null'],maxItems:8,items:{type:'object',properties:{name:{type:'string'},reason:{type:'string'}},required:['name','reason'],additionalProperties:false}},
    reply: { type: 'string' }, action: { type: 'string', enum: ['none','add_pet','add_shopping_items','set_pet_settings','set_pet_place','plan','remember_comfort','remember_profile','remember_care','set_preferred_vet','set_meal_routine','stop_meal_routine','show_walk_routes','show_places','save_service','complete_event'] },
    title: nullableString, startAt: nullableString, location: nullableString, social: nullableString,
    targetId: nullableString, minutes: { type: ['integer','null'] }, repeatDays: { type: ['integer','null'] },
    petName: nullableString, species: nullableString, age: nullableString, breed: nullableString, goals: nullableString,
    training: nullableString, careNote: nullableString, breakfastAt:nullableString, dinnerAt:nullableString,
    settingCategory:nullableString,settingUpdates:{type:['array','null'],maxItems:6,items:{type:'object',properties:{field:{type:'string'},value:{type:'string'}},required:['field','value'],additionalProperties:false}},placeSaved:{type:['boolean','null']},
    placeCategory:{type:['string','null'],enum:['park','vet','shop','cafe','hotel','boarding','groomer','charity','sitter','trainer','shelter','funeral',null]},
    walkMinutes:{type:['integer','null']},walkStop:{type:['string','null'],enum:['none','rest','cafe','friends',null]},
  };
  const input = [{ role: 'developer', content: JSON.stringify(facts) }, ...history.slice(-20).map(({role,content})=>({role,content})), { role: 'user', content: message }];
  const choice = { type: 'function', name: 'offer_choice', description: 'Reply and optionally offer one change for owner review. Does not execute it.', strict: true,
    parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } };
  const instructions = companionInstructions + sectionInstructions(facts.section);
  const signal = AbortSignal.timeout(90000);
  async function request(extra) {
    let response;
    try { response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST', signal, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, store:false, max_output_tokens:3500, instructions, ...extra }),
    }); } catch { throw new Problem('Pip could not finish checking. No changes were made. Please try again.',503); }
    if (!response.ok) throw new Problem('AI could not respond. No changes were made. Please try again.',503);
    const body = await response.json();
    if(body.status==='incomplete')throw new Problem('Pip could not finish checking. No changes were made. Please try again.',503);
    return body;
  }
  let body = await request({input,tools:[choice,{type:'web_search',external_web_access:true}],tool_choice:'auto',include:['web_search_call.action.sources']});
  const researchOutput = body.output || [];
  const sources = researchSources(researchOutput);
  let calls = (body.output || []).filter(item=>item.type==='function_call'&&item.name==='offer_choice');
  if (!calls.length) {
    body = await request({input:[...input,...researchOutput,{role:'developer',content:'Now deliver the researched answer through offer_choice. Preserve source-backed details, dates and uncertainty. Do not invent a result or perform a mutation.'}],tools:[choice],tool_choice:{type:'function',name:'offer_choice'},parallel_tool_calls:false});
    calls = (body.output || []).filter(item=>item.type==='function_call'&&item.name==='offer_choice');
  }
  if(calls.length!==1)throw new Problem('AI returned an unsupported response. No changes were made.',503);
  let result;
  try { result = JSON.parse(calls[0].arguments); } catch { throw new Problem('AI could not prepare a response.', 503); }
  if (!result || typeof result.reply !== 'string' || !properties.action.enum.includes(result.action)) throw new Problem('AI returned an unsupported choice.', 503);
  return {...proposalFromAgentResult(result, facts), ...(sources.length?{sources,researchedAt:new Date().toISOString()}: {})};
}

// Only API-provided research metadata becomes a source link, never model arguments.
export function researchSources(output) {
  const found = [];
  for(const item of output) {
    for(const part of item.content || []) for(const annotation of part.annotations || [])
      if(annotation.type==='url_citation')found.push(annotation);
    if(item.type==='web_search_call')found.push(...(item.action?.sources || []));
  }
  const seen=new Set();
  return found.flatMap(source=>{
    try {
      const url=new URL(source.url);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password||seen.has(url.href))return [];
      seen.add(url.href);
      return [{url:url.href,title:typeof source.title==='string'?source.title.slice(0,180):url.hostname}];
    } catch {return [];}
  }).slice(0,12);
}
