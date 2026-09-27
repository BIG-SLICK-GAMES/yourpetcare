import { Problem, ideasFor, species } from './domain.js';
import { companionInstructions } from './companion-instructions.js';

export function agentFacts(account, petId, providers) {
  const pet = account.pets.find(p => p.id === petId) || null;
  if (!pet && (petId || account.pets.length)) throw new Problem('Choose a pet first.', 404);
  return { now: new Date().toISOString(), pet, ideas: ideasFor(pet),
    pendingChoices: account.proposals.filter(p=>p.status==='pending'&&Date.parse(p.expiresAt)>Date.now()&&(p.petId===pet?.id||(!pet&&p.action==='add_pet'))).map(p=>({id:p.id,action:p.action,status:p.status,data:p.data})),
    recentChoices: account.proposals.filter(p=>p.status!=='pending'&&p.petId===pet?.id).slice(-4).map(p=>({action:p.action,status:p.status,data:p.data})),
    supplies: account.supplies || {stores:[],saleAlerts:false},
    preferredVet: providers.find(p=>p.id===pet?.preferredVetId) || null,
    careGaps: pet ? [!pet.preferredVetId && 'preferred vet', !pet.mealRoutine && 'feeding routine', !pet.age && 'age', pet.social==='unknown' && 'confidence', !pet.careNotes && 'routine and preferences'].filter(Boolean) : [],
    species, events: account.events.filter(e => e.petId === pet?.id && e.status === 'planned').sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).slice(0, 12),
    services: providers.map(p => ({ id: p.id, name: p.name, category: p.category, address: p.address, species: p.species_supported })),
    weather: 'No live weather is connected.', crowds: 'No park crowd information is available.' };
}

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
      instructions: companionInstructions,
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
  let input = null;
  if (!['none','add_pet','show_walk_routes'].includes(result.action) && !facts.pet) throw new Problem('Meet your pet before making a plan.');
  if (result.action === 'add_pet') {
    if (facts.pet) throw new Problem('Add another pet from My pets.');
    input = { action: 'add_pet', data: { name: result.petName, species: result.species, age: result.age || '', breed: result.breed || '', goals: result.goals || '', social: result.social || 'unknown', training: 'unknown' } };
  }
  if (result.action === 'plan') input = { action: 'plan', petId: facts.pet.id, data: { title: result.title, startAt: result.startAt, minutes: result.minutes, location: result.location ?? '', repeatDays: result.repeatDays ?? 0 } };
  if (result.action === 'remember_comfort') input = { action: 'update_pet', petId: facts.pet.id, data: { ...facts.pet, social: result.social } };
  if (result.action === 'remember_profile') {
    const data={...facts.pet};
    for(const field of ['age','breed','goals','training','social'])if(result[field]!==null&&result[field]!==undefined)data[field]=result[field];
    input={action:'update_pet',petId:facts.pet.id,data};
  }
  if (result.action === 'remember_care') {
    if(typeof result.careNote!=='string'||!result.careNote.trim()||result.careNote.length>600)throw new Problem('Please keep this memory to one short note.');
    const existing=facts.pet.careNotes||'';
    input={action:'update_pet',petId:facts.pet.id,data:{...facts.pet,careNotes:[existing,result.careNote.trim()].filter(Boolean).join('\n')}};
  }
  if (result.action === 'set_preferred_vet') {
    input={action:'set_preferred_vet',petId:facts.pet.id,data:{providerId:result.targetId}};
  }
  if (result.action === 'stop_meal_routine') input={action:'stop_meal_routine',petId:facts.pet.id,data:{}};
  if (result.action === 'set_meal_routine') input={action:'set_meal_routine',petId:facts.pet.id,data:{breakfastAt:result.breakfastAt,dinnerAt:result.dinnerAt}};
  if (result.action === 'save_service') {
    if (!facts.services.some(p => p.id === result.targetId)) throw new Problem('AI suggested an unknown service.', 503);
    input = { action: 'save_service', petId: facts.pet.id, data: { providerId: result.targetId } };
  }
  if (result.action === 'complete_event') {
    if (!facts.events.some(e => e.id === result.targetId)) throw new Problem('AI suggested an unknown event.', 503);
    input = { action: 'complete_event', petId: facts.pet.id, data: { eventId: result.targetId } };
  }
  return { reply: result.reply.slice(0, 1200), input, ...(result.action==='show_walk_routes'?{navigation:{screen:'map',mode:'walk',...(Number.isInteger(result.walkMinutes)&&result.walkMinutes>=10&&result.walkMinutes<=120?{minutes:result.walkMinutes}:{}),...(['none','rest','cafe','friends'].includes(result.walkStop)?{stop:result.walkStop}:{})}}:{}) };
}
