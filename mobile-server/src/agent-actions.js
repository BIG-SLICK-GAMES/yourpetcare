import { Problem } from './domain.js';

// Converts a provider response into a proposal; never executes an account write.
export function proposalFromAgentResult(result, facts) {
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
