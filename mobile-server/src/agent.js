import { Problem } from './domain.js';
import { proposalFromAgentResult } from './agent-actions.js';
export { agentFacts } from './pet-context.js';
import { companionInstructions } from './companion-instructions.js';
import { sectionInstructions } from './chat-sections.js';
import { shoppingResearchTool, shoppingResearchInstructions } from './shopping-research.js';
import { taskStateSchema, taskState, forwardThinkingInstructions } from './pip-task.js';

export async function askAgent(facts, history, message, { apiKey, model, fetcher = fetch }) {
  if (!apiKey) throw new Problem('AI is not connected yet. You can still plan and explore using the activity buttons.', 503);
  const nullableString = { type: ['string', 'null'] };
  const properties = {
    taskState:taskStateSchema,
    shoppingSuggestions:{type:['array','null'],maxItems:8,items:{type:'object',properties:{name:{type:'string'},reason:{type:'string'},store:{type:['string','null']}},required:['name','reason','store'],additionalProperties:false}},
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
  const instructions = companionInstructions + forwardThinkingInstructions + sectionInstructions(facts.section) + (facts.section==='shopping'?shoppingResearchInstructions:'');
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
  const web = {type:'web_search',external_web_access:true};
  let body = await request({input,tools:facts.section==='shopping'?[choice,shoppingResearchTool]:[choice,web],tool_choice:'auto',parallel_tool_calls:false,include:['web_search_call.action.sources']});
  const shoppingCalls=(body.output||[]).filter(item=>item.type==='function_call'&&item.name==='research_shopping');
  let continuation=input;
  if(shoppingCalls.length){
    if(facts.section!=='shopping'||shoppingCalls.length!==1||(body.output||[]).filter(item=>item.type==='function_call').length!==1)throw new Problem('Pip could not prepare that search. No changes were made.',503);
    continuation=[...input,...body.output,{type:'function_call_output',call_id:shoppingCalls[0].call_id,output:'Research requested. Use live web search now; nothing has been saved or purchased.'}];
    // A research request must actually search, never turn into an ungrounded answer.
    body=await request({input:continuation,tools:[web],tool_choice:'required',include:['web_search_call.action.sources']});
  }
  const researchOutput = body.output || [];
  const sources = researchSources(researchOutput);
  if(shoppingCalls.length&&!sources.length)return {reply:'I could not verify current prices from retailer sources just now. Your list is unchanged. Shall I try a particular store?',input:null};
  let calls = (body.output || []).filter(item=>item.type==='function_call'&&item.name==='offer_choice');
  if (!calls.length) {
    body = await request({input:[...continuation,...researchOutput,{role:'developer',content:'Now deliver the researched answer through offer_choice. Preserve source-backed details, dates and uncertainty. Do not invent a result or perform a mutation. For shopping retain the price/pack/currency and location shortlist and explain the best overall option. Source links appear below your reply.'}],tools:[choice],tool_choice:{type:'function',name:'offer_choice'},parallel_tool_calls:false});
    calls = (body.output || []).filter(item=>item.type==='function_call'&&item.name==='offer_choice');
  }
  if(calls.length!==1)throw new Problem('AI returned an unsupported response. No changes were made.',503);
  let result;
  try { result = JSON.parse(calls[0].arguments); } catch { throw new Problem('AI could not prepare a response.', 503); }
  if (!result || typeof result.reply !== 'string' || !properties.action.enum.includes(result.action)) throw new Problem('AI returned an unsupported choice.', 503);
  result.reply=result.reply.replace(/\uE200[^\uE201]*\uE201/g,'').trim();
  return {...proposalFromAgentResult(result, facts),taskState:taskState(result.taskState), ...(sources.length?{sources,researchedAt:new Date().toISOString()}: {})};
}

// Only API-provided research metadata becomes a source link, never model arguments.
export function researchSources(output) {
  const found = [];
  for(const item of output) {
    for(const part of item.content || []) for(const annotation of part.annotations || [])
      if(annotation.type==='url_citation')found.push(annotation);
  }
  for(const item of output) {
    if(item.type==='web_search_call'&&item.action?.url)found.push({url:item.action.url});
  }
  for(const item of output) {
    if(item.type==='web_search_call')found.push(...(item.action?.sources || []));
  }
  const seen=new Set();
  return found.flatMap(source=>{
    try {
      const url=new URL(source.url);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password||seen.has(url.href))return [];
      seen.add(url.href);
      return [{url:url.href,title:typeof source.title==='string'?source.title.slice(0,180):url.hostname+decodeURI(url.pathname).replace(/[-_]/g,' ')}];
    } catch {return [];}
  }).slice(0,12);
}
