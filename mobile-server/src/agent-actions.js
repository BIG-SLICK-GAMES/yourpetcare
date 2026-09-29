import { Problem } from './domain.js';

// Converts a provider response into a proposal; never executes an account write.
export function proposalFromAgentResult(result, facts) {
  let input = null;
  if (!['none','add_pet','show_walk_routes','show_places','add_shopping_items'].includes(result.action) && !facts.pet) throw new Problem('Meet your pet before making a plan.');
  if (result.action === 'add_pet') {
    if (facts.pet) throw new Problem('Add another pet from My pets.');
    input = { action: 'add_pet', data: { name: result.petName, species: result.species, age: result.age || '', breed: result.breed || '', goals: result.goals || '', social: result.social || 'unknown', training: 'unknown' } };
  }
  if(result.action==='add_shopping_items'){
    const lists=facts.shoppingLists||[];
    const listId=facts.shoppingList?.id||result.targetId||(lists.length===1?lists[0].id:!lists.length?'essentials':null);
    if(!listId||(lists.length&&!lists.some(l=>l.id===listId)))throw new Problem('Choose which shopping list to use.');
    if(!Array.isArray(result.shoppingSuggestions)||!result.shoppingSuggestions.length||result.shoppingSuggestions.length>8||result.shoppingSuggestions.some(i=>typeof i?.name!=='string'))throw new Problem('Pip could not prepare those shopping items.',503);
    input={action:'add_shopping_items',petId:facts.pet?.id||null,data:{listId,createList:!lists.length,items:result.shoppingSuggestions.map(i=>({name:i.name,store:''}))}};
  }
  if(result.action==='set_pet_settings'){
    if(!Array.isArray(result.settingUpdates)||!result.settingUpdates.length||result.settingUpdates.length>6||result.settingUpdates.some(i=>typeof i?.field!=='string'||typeof i.value!=='string')||new Set(result.settingUpdates.map(i=>i.field)).size!==result.settingUpdates.length)throw new Problem('Pip could not prepare those settings.',503);
    input={action:'set_pet_settings',petId:facts.pet.id,data:{category:result.settingCategory,values:Object.fromEntries(result.settingUpdates.map(i=>[i.field,i.value]))}};
  }
  if(result.action==='set_pet_place'){
    if(!facts.services.some(p=>p.id===result.targetId)||typeof result.placeSaved!=='boolean')throw new Problem('Choose a known place to remember.',503);
    input={action:'set_pet_place',petId:facts.pet.id,data:{providerId:result.targetId,saved:result.placeSaved}};
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
  let placesNavigation;
  if(result.action==='show_places'){
    if(!['park','vet','shop','cafe','hotel','boarding','groomer','charity','sitter','trainer','shelter','funeral'].includes(result.placeCategory))throw new Problem('Pip could not select that map category.',503);
    placesNavigation={screen:'map',mode:'places',category:result.placeCategory};
  }
  let shoppingSuggestions;
  if(result.action!=='add_shopping_items'&&facts.section==='shopping'&&facts.shoppingList&&result.shoppingSuggestions!=null){
    if(!Array.isArray(result.shoppingSuggestions)||result.shoppingSuggestions.length>8||result.shoppingSuggestions.some(i=>!i||typeof i.name!=='string'||!i.name.trim()||i.name.length>150||typeof i.reason!=='string'||i.reason.length>300))throw new Problem('Pip could not prepare those shopping ideas. Please try again.',503);
    shoppingSuggestions=result.shoppingSuggestions.map(i=>({name:i.name.trim(),reason:i.reason.trim()}));
  }
  return { ...(placesNavigation?{navigation:placesNavigation}:{}), ...(shoppingSuggestions?{shoppingSuggestions}:{}), reply: result.reply.slice(0, 1200), input, ...(result.action==='show_walk_routes'?{navigation:{screen:'map',mode:'walk',...(Number.isInteger(result.walkMinutes)&&result.walkMinutes>=10&&result.walkMinutes<=120?{minutes:result.walkMinutes}:{}),...(['none','rest','cafe','friends'].includes(result.walkStop)?{stop:result.walkStop}:{})}}:{}) };
}
