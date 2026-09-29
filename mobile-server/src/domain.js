import { shoppingLists, shoppingItems, changeShopping } from './shopping.js';
import {petSettingCategories,preparePetSettings} from './pet-settings.js';
import { attentionItems } from './attention.js';
import { randomUUID } from 'node:crypto';
import {careActions,prepareCare,applyCare} from './care-actions.js';
import {careDateLabel,cleanRecurrence,nextOccurrence,repeatLabel,careInsights,inventoryEstimate} from './care.js';

export const species = ['Dog', 'Cat', 'Horse', 'Bird', 'Reptile', 'Rabbit', 'Guinea pig', 'Small mammal', 'Fish', 'Amphibian', 'Invertebrate', 'Farm animal', 'Other'];
export const socialChoices = ['unknown', 'quiet', 'building', 'social'];
export class Problem extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const string = (value, max, label, required = true) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Problem(`Check ${label}.`);
  return value.trim();
};
export function cleanPet(input) {
  input={social:'unknown',training:'unknown',...input};
  if (!species.includes(input.species)) throw new Problem('Choose an animal type.');
  if (!socialChoices.includes(input.social)) throw new Problem('Choose their comfort around others.');
  if (!['unknown','starting','basics','comfortable','advanced'].includes(input.training)) throw new Problem('Choose a training level.');
  return {
    name: string(input.name, 80, 'their name'), species: input.species,
    breed: string(input.breed ?? '', 100, 'their breed or kind', false),
    age: string(input.age ?? '', 60, 'their age', false), social: input.social, training: input.training,
    goals: string(input.goals ?? '', 500, 'what you would like to do', false),
    careNotes: string(input.careNotes ?? '', 4000, 'care notes', false),
  };
}
export function initialAccount(username, passwordHash) {
  return { _id: randomUUID(), username, passwordHash, version: 0, pets: [], events: [], proposals: [], saved: [], messages: {}, tokens: [], createdAt: new Date().toISOString() };
}
export function accountView(account) {
  return { id: account._id, username: account.username, pets: account.pets, events: account.events, saved: account.saved,
    inventory:(account.inventory||[]).map(i=>({...i,estimate:inventoryEstimate(i)})),insights:careInsights(account),documents:account.documents||[],
    notificationPreferences:account.notificationPreferences||{important:true,helpful:true,optional:false},audit:(account.audit||[]).slice(-100).map(({id,actorId,petId,action,at,source})=>({id,actorId,petId,action,at,source})),
    shopping: shoppingItems(account), shoppingLists: shoppingLists(account),
    attention: attentionItems(account).filter(item=>!(account.dismissedAttention||[]).includes(item.id)),
    dismissedAttention: account.dismissedAttention || [],
    supplies: account.supplies || {stores:[],saleAlerts:false},
    proposals: account.proposals.filter(p => p.status === 'pending' && Date.parse(p.expiresAt) > Date.now()), messages: account.messages };
}
export function prepare(account, input, providers, now = Date.now()) {
  const action = input.action;
  const pet = account.pets.find(p => p.id === input.petId);
  if (!['add_pet','set_supplies','save_service','add_shopping_items','set_notification_preferences'].includes(action) && !pet) throw new Problem('Select one of your pets.', 404);
  let data, before = null, summary, details;
  if(careActions.includes(action)){
    ({data,before,summary,details}=prepareCare(account,pet,action,input.data||{},now));
  }else if(action==='set_pet_settings'){
    data=preparePetSettings(pet,input.data);before=structuredClone(pet.careSettings?.[data.category]||{});
    const category=petSettingCategories[data.category];summary=`Save ${pet.name}'s ${category.title.toLowerCase()}`;
    details=[['Pet',pet.name],...Object.entries(input.data.values).map(([field])=>[category.fields[field],data.values[field]||'Clear this detail'])];
  }else if(action==='set_pet_place'){
    const provider=providers.find(p=>p.id===input.data?.providerId);
    if(!provider||typeof input.data?.saved!=='boolean')throw new Problem('Choose a place from the directory.',404);
    if(input.data.saved&&!pet.favouritePlaceIds?.includes(provider.id)&&(pet.favouritePlaceIds||[]).length>=50)throw new Problem('You can save up to 50 places for each pet.');
    data={providerId:provider.id,saved:input.data.saved};summary=`${data.saved?'Remember':'Remove'} ${provider.name} ${data.saved?'for':'from'} ${pet.name}'s places`;
    details=[['Pet',pet.name],['Place',provider.name],['Address',provider.address||'Not recorded'],['Profile',data.saved?'Save as a favourite place':'Remove from this pet only']];
  }else if(action==='add_shopping_items'){
    const list=shoppingLists(account).find(l=>l.id===input.data?.listId);
    const createList=!list&&input.data?.createList===true&&input.data?.listId==='essentials'&&!shoppingLists(account).length;
    if(!list&&!createList)throw new Problem('That shopping list is no longer available.',404);
    if(!Array.isArray(input.data?.items)||!input.data.items.length||input.data.items.length>8)throw new Problem('Choose one to eight shopping items.');
    const copy=structuredClone(account);
    const items=input.data.items.map(item=>({name:string(item?.name,150,'the shopping item'),store:string(item?.store??'',100,'the store',false)}));
    for(const item of items)changeShopping(copy,{action:'add',...(createList?{}:{listId:list.id}),...item});
    data={listId:list?.id||'essentials',createList,items};before={listName:list?.name||null};
    summary=`Add ${items.length===1?items[0].name:items.length+' items'} to ${list?.name||'My shopping list'}`;
    details=[['List',list?.name||'My shopping list (new)'],...items.map((item,i)=>[`Item ${i+1}`,item.name]),['Saving','Only after you confirm. No purchase is made.']];
  } else if (action === 'set_supplies') {
    const stores=input.data?.stores;
    if(!Array.isArray(stores)||stores.length>5||typeof input.data.saleAlerts!=='boolean')throw new Problem('Choose up to five stores and an alert preference.');
    data={stores:stores.map(store=>{const provider=store?.providerId?providers.find(p=>p.id===store.providerId&&p.category==='shop'):null;if(store?.providerId&&!provider)throw new Problem('Choose a supplies store from the directory.',404);if(provider)store={name:provider.name,website:provider.website,address:provider.address,providerId:provider.id};const name=string(store?.name,100,'the store name');const website=string(store?.website||'',300,'the store website',false);if(website){let url;try{url=new URL(website);}catch{throw new Problem('Enter a full https:// store website.');}if(url.protocol!=='https:'||url.username||url.password)throw new Problem('Use an HTTPS store website without sign-in details.');}return {name,website,...(store.address?{address:string(store.address,300,'the store address')}:{}),...(provider?{providerId:provider.id}:{})};}),saleAlerts:input.data.saleAlerts};
    if(new Set(data.stores.map(s=>`${s.name.toLowerCase()}|${s.website.toLowerCase()}|${s.address||''}`)).size!==stores.length)throw new Problem('This store is already in your list.');
    before=structuredClone(account.supplies||{stores:[],saleAlerts:false});summary='Your supplies stores';
    details=[...data.stores.map(s=>['Store',[s.name,s.address,s.website].filter(Boolean).join(' ? ')]),['Offer alerts',data.saleAlerts?'On, for connected feeds when the app refreshes':'Off'],['Calendar','Sale reminders are added only when you review and confirm them']];
  } else if (action === 'add_pet' || action === 'update_pet') {
    const updates={...input.data};
    if('appendCareNote' in updates){const note=string(updates.appendCareNote,600,'the new care note');updates.careNotes=[pet?.careNotes||'',note].filter(Boolean).join('\n');delete updates.appendCareNote;}
    data = cleanPet({ ...pet, ...updates });
    if (action === 'add_pet' && account.pets.length >= 30) throw new Problem('This account has reached its pet limit.');
    before = pet ? structuredClone(pet) : null;
    summary = action === 'add_pet' ? `Meet ${data.name}` : `Remember this about ${data.name}`;
    details = [['Name', data.name], ['Animal', data.species], ['Breed / kind', data.breed || 'Not recorded'], ['Age', data.age || 'Not recorded'], ['Comfort', data.social], ['Training', data.training], ['Together', data.goals || 'Still exploring']];
    if(data.careNotes)details.push(['Care notes',data.careNotes]);
  } else if (action === 'remove_pet') {
    data={};before={pet:structuredClone(pet),events:structuredClone(account.events.filter(e=>e.petId===pet.id))};
    summary=`Remove ${pet.name}'s profile?`;
    details=[['Pet',pet.name],['Remove permanently','This pet profile, their calendar events, reminders and conversations'],['Other pets','Your other pets and saved places stay unchanged'],['Device reminders','Other signed-in devices update when they next refresh']];
  } else if (action === 'set_preferred_vet') {
    const provider=providers.find(p=>p.id===input.data?.providerId&&p.category==='vet');
    if(!provider)throw new Problem('Choose a vet from the directory.',404);
    data={providerId:provider.id};before={preferredVetId:pet.preferredVetId||null};
    summary=`${pet.name}'s preferred vet`;
    details=[['Clinic',provider.name],['Address',provider.address||'Not recorded'],['Phone',provider.phone||'Not recorded'],['Appointment','No booking is made']];
  } else if (action === 'set_meal_routine') {
    const meals=['Breakfast','Dinner'].map((title,i)=>prepare(account,{action:'plan',petId:pet.id,data:{title,startAt:i?input.data?.dinnerAt:input.data?.breakfastAt,minutes:5,repeatDays:1,location:'Home'}},providers,now).data);
    if(account.events.length>998)throw new Problem('The calendar has reached its current event limit.');
    const existing=account.events.filter(e=>e.petId===pet.id&&e.status==='planned'&&(e.routine==='meals'||/^(breakfast|dinner)$/i.test(e.title)));
    if(pet.mealRoutine&&['breakfastAt','dinnerAt'].every((key,i)=>Date.parse(pet.mealRoutine[key])%86400000===Date.parse(meals[i].startAt)%86400000))throw new Problem('These meal reminders already exist. No duplicate was added.',409);
    data={breakfastAt:meals[0].startAt,dinnerAt:meals[1].startAt};before={mealRoutine:pet.mealRoutine||null,events:structuredClone(existing)};
    summary=`${pet.name}'s meal routine`;
    details=[['Breakfast',data.breakfastAt],['Dinner',data.dinnerAt],['Repeat','Every 24 hours'],['Save','Meal times in profile and two calendar reminders'],['Existing reminders',existing.length?'Replace existing meal reminders':'None replaced'],['Notifications','Enable device reminders in the installed app; reopen regularly to refresh the next 50 reminders']];
  } else if(action==='stop_meal_routine') {
    const events=account.events.filter(e=>e.petId===pet.id&&e.status==='planned'&&e.routine==='meals');
    if(!pet.mealRoutine||!events.length)throw new Problem('No saved meal routine to stop.');
    data={};before={mealRoutine:structuredClone(pet.mealRoutine),events:structuredClone(events)};
    summary=`Stop ${pet.name}'s meal reminders`;
    details=[['Profile','Remove saved meal reminder times'],['Calendar','Cancel breakfast and dinner reminders'],['Feeding','This only stops reminders, not your pet’s care']];
  } else if (action === 'plan') {
    const title = string(input.data?.title, 150, 'the activity');
    const startAt = string(input.data?.startAt, 40, 'the date and time');
    const minutes = Number(input.data?.minutes);
    if (!Number.isFinite(Date.parse(startAt)) || !/(Z|[+-]\d{2}:\d{2})$/.test(startAt) || Date.parse(startAt) <= now || Date.parse(startAt) > now + 730 * 86400000) throw new Problem('Choose a future date and time within two years.');
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) throw new Problem('Choose a duration from 5 to 1,440 minutes.');
    const repeatDays = Number(input.data?.repeatDays ?? 0);
    if (!Number.isInteger(repeatDays) || repeatDays < 0 || repeatDays > 365) throw new Problem('Choose a repeat interval from 0 to 365 days.');
    data = { title, startAt: new Date(startAt).toISOString(), minutes, repeatDays, location: string(input.data?.location ?? '', 300, 'the place', false) };
    if(input.data?.recurrence){data.recurrence=cleanRecurrence(input.data.recurrence);data.repeatDays=0;data.recurrenceAnchor=data.startAt;}
    if(input.data?.reminderMinutes!==undefined){if(!Number.isInteger(input.data.reminderMinutes)||input.data.reminderMinutes<0||input.data.reminderMinutes>43200)throw new Problem('Choose a reminder lead time up to 30 days.');data.reminderMinutes=input.data.reminderMinutes;}
    if(input.data?.priority!==undefined){if(!['important','helpful','optional'].includes(input.data.priority))throw new Problem('Choose a notification category.');data.priority=input.data.priority;}
    if(input.data?.inventoryId){
      const item=(account.inventory||[]).find(i=>i.id===input.data.inventoryId&&i.petId===pet.id);
      if(item?.dailyUse>0)throw new Problem('This supply uses daily estimates. Record its current quantity without linking a second consumption schedule.');
      if(!item||typeof input.data.quantityUsed!=='number'||input.data.quantityUsed<=0||!Number.isFinite(input.data.quantityUsed))throw new Problem('Choose this pet’s supply and an owner-recorded quantity per completion.');
      data.inventoryId=item.id;data.quantityUsed=input.data.quantityUsed;
    }
    summary = `${title} with ${pet.name}`;
    details = [['Activity', title], ['When', data.startAt], ['Minutes', String(minutes)], ['Place', data.location || 'Not decided'], ['Repeats', repeatDays ? `Every ${repeatDays} days` : 'Once'], ['Reminder', 'At the start, on devices where you enable reminders']];
    details[4]=['Repeats',repeatLabel(data)];details[5]=['Reminder',`${data.reminderMinutes||0} minutes before, where device reminders are enabled`];
    if(data.inventoryId)details.push(['Supply used per completion',`${data.quantityUsed} ${(account.inventory||[]).find(i=>i.id===data.inventoryId).unit}`]);
    if (account.events.length >= 1000) throw new Problem('The calendar has reached its current event limit.');
  } else if (action === 'complete_event') {
    const event = account.events.find(e => e.id === input.data?.eventId && e.petId === pet.id && e.status === 'planned');
    if (!event) throw new Problem('That event is not pending for this pet.', 404);
    data = { eventId: event.id }; before = structuredClone(event);
    if(event.inventoryId){const item=(account.inventory||[]).find(i=>i.id===event.inventoryId&&i.petId===pet.id);if(!item||item.dailyUse>0||!Number.isFinite(item.quantity)||!Number.isFinite(event.quantityUsed)||event.quantityUsed<=0||item.quantity<event.quantityUsed)throw new Problem('Check the recorded supply quantity before completing this care item.');data.inventoryBefore=structuredClone(item);}
    summary = `Mark ${event.title} complete`;
    const next=nextOccurrence(event,Math.max(now,Date.parse(event.startAt)));
    details = [['Pet', pet.name], ['Activity', event.title], ['Next due', next||'No repeat'],['Completed at',new Date(now).toISOString()]];
    if(data.inventoryBefore)details.push(['Supply after completion',`${data.inventoryBefore.quantity-event.quantityUsed} ${data.inventoryBefore.unit}`]);
  } else if (action === 'save_service') {
    const provider = providers.find(p => p.id === input.data?.providerId);
    if (!provider) throw new Problem('Choose a service from the directory.', 404);
    data = { providerId: provider.id }; summary = `Save ${provider.name}`;
    details = [['Service', provider.name], ['Address', provider.address || 'Not recorded']];
  } else throw new Problem('That action is not supported.');
  return { id: randomUUID(), userId:account._id, action, petId: pet?.id ?? null, data, before, summary, details, source:'app', status: 'pending', createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 30 * 60000).toISOString() };
}
export function stage(account, input, providers, replaceId) {
  const previous = replaceId && account.proposals.find(p => p.id === replaceId && p.status === 'pending');
  if (replaceId && (!previous || Date.parse(previous.expiresAt) <= Date.now())) throw new Problem('That choice has expired or has already been handled.', 409);
  const proposal = prepare(account, input, providers);
  for(const p of account.proposals)if(p.status==='pending'&&Date.parse(p.expiresAt)<=Date.now())p.status='expired';
  if(account.proposals.filter(p=>p.status==='pending').length>=30)throw new Problem('Review or cancel a waiting choice before adding another.');
  account.proposals = account.proposals.filter(p=>p.status==='pending').concat(account.proposals.filter(p=>p.status!=='pending').slice(-100));
  if (previous) previous.status = 'cancelled';
  account.proposals.push(proposal);
  return proposal;
}
export function decide(account, id, decision, providers, now = Date.now()) {
  const proposal = account.proposals.find(p => p.id === id);
  if (!proposal) throw new Problem('Choice not found.', 404);
  if (!['confirm','cancel'].includes(decision)) throw new Problem('Choose Confirm or Cancel.');
  if (proposal.status !== 'pending') return proposal;
  if (decision === 'cancel') { proposal.status = 'cancelled'; proposal.report='Cancelled. Nothing was changed.'; return proposal; }
  if (Date.parse(proposal.expiresAt) <= now) throw new Problem('This choice has expired. Please make a new one.', 409);
  // Validate again using current owner data before applying any change.
  prepare(account, proposal.action==='save_inventory'&&!proposal.before?{...proposal,data:{...proposal.data,id:undefined}}:proposal, providers, now);
  const pet = account.pets.find(p => p.id === proposal.petId);
  if(proposal.userId&&proposal.userId!==account._id)throw new Problem('This choice belongs to another account.',403);
  if (proposal.action === 'update_pet' && JSON.stringify(pet) !== JSON.stringify(proposal.before)) throw new Problem('This pet profile changed. Please review a new choice.', 409);
  if(careActions.includes(proposal.action)){
    applyCare(account,pet,proposal,now);
  }else if(proposal.action==='set_pet_settings'){
    if(JSON.stringify(pet.careSettings?.[proposal.data.category]||{})!==JSON.stringify(proposal.before))throw new Problem('These settings changed. Please review the latest details.',409);
    pet.careSettings={...pet.careSettings,[proposal.data.category]:proposal.data.values};proposal.resultId=pet.id;
  }else if(proposal.action==='set_pet_place'){
    pet.favouritePlaceIds=proposal.data.saved?[...new Set([...(pet.favouritePlaceIds||[]),proposal.data.providerId])]:(pet.favouritePlaceIds||[]).filter(id=>id!==proposal.data.providerId);proposal.resultId=pet.id;
  }else if(proposal.action==='add_shopping_items'){
    const list=shoppingLists(account).find(l=>l.id===proposal.data.listId);
    if((list?.name||null)!==proposal.before.listName)throw new Problem('Your shopping list changed. Please review a new choice.',409);
    for(const item of proposal.data.items)changeShopping(account,{action:'add',...(proposal.data.createList?{}:{listId:proposal.data.listId}),...item});
    proposal.resultId=proposal.data.listId;
  } else if (proposal.action === 'set_supplies') {
    if(JSON.stringify(account.supplies||{stores:[],saleAlerts:false})!==JSON.stringify(proposal.before))throw new Problem('Your store preferences changed. Please review them again.',409);
    account.supplies=structuredClone(proposal.data);proposal.resultId=account._id;
  } else if (proposal.action === 'add_pet') {
    account.pets.push({ ...proposal.data, id: proposal.id });
    proposal.resultId = proposal.id;
  } else if (proposal.action === 'update_pet') {
    Object.assign(pet, proposal.data); proposal.resultId = pet.id;
  } else if (proposal.action === 'remove_pet') {
    if(JSON.stringify({pet,events:account.events.filter(e=>e.petId===pet.id)})!==JSON.stringify(proposal.before))throw new Problem('This pet or their calendar changed. Please review removal again.',409);
    account.pets=account.pets.filter(p=>p.id!==pet.id);
    account.events=account.events.filter(e=>e.petId!==pet.id);
    account.inventory=(account.inventory||[]).filter(i=>i.petId!==pet.id);account.documents=(account.documents||[]).filter(d=>d.petId!==pet.id);account.audit=(account.audit||[]).filter(a=>a.petId!==pet.id);
    for(const key of Object.keys(account.messages))if(key===pet.id||key.startsWith(`${pet.id}::`))delete account.messages[key];
    account.proposals=account.proposals.filter(p=>p.petId!==pet.id||p.id===proposal.id);
    proposal.before=null;proposal.resultId=pet.id;
  } else if (proposal.action === 'plan') {
    account.events.push({ ...proposal.data, id: proposal.id, petId: pet.id, status: 'planned' }); proposal.resultId = proposal.id;
  } else if (proposal.action === 'complete_event') {
    const event = account.events.find(e => e.id === proposal.data.eventId);
    if (JSON.stringify(event) !== JSON.stringify(proposal.before)) throw new Problem('This event changed. Please review a new choice.', 409);
    const next=nextOccurrence(event,Math.max(now,Date.parse(event.startAt)));
    if (next && account.events.length >= 1000) throw new Problem('The calendar has reached its current event limit.');
    if(event.inventoryId){const item=(account.inventory||[]).find(i=>i.id===event.inventoryId&&i.petId===pet.id);if(JSON.stringify(item)!==JSON.stringify(proposal.data.inventoryBefore))throw new Problem('The supply quantity changed. Review this completion again.',409);item.quantity-=event.quantityUsed;item.quantityAt=new Date(now).toISOString();}
    event.status = 'completed'; event.completedAt = new Date(now).toISOString();event.completedBy=account._id;
    if(next){const future={...event,id:randomUUID(),status:'planned',startAt:next,recurrenceAnchor:event.recurrenceAnchor||event.startAt};delete future.completedAt;delete future.completedBy;delete future.snoozedUntil;account.events.push(future);}
    const remaining=event.inventoryId?(account.inventory||[]).find(i=>i.id===event.inventoryId).quantity:null;
    proposal.report=`Recorded ${event.title} complete for ${pet.name}.${next?` Next due ${careDateLabel(next,proposal.timezone)}.`:''}${event.inventoryId?` Supply remaining: ${remaining} ${proposal.data.inventoryBefore.unit}.`:''}${remaining!==null&&remaining<event.quantityUsed?' Would you like a reminder to restock?':''}`;
    proposal.resultId = event.id;
  } else if (proposal.action === 'save_service') {
    if (!account.saved.includes(proposal.data.providerId)) account.saved.push(proposal.data.providerId);
    proposal.resultId = proposal.data.providerId;
  } else if (proposal.action === 'set_preferred_vet') {
    if((pet.preferredVetId||null)!==proposal.before.preferredVetId)throw new Problem('The preferred vet changed. Please review a new choice.',409);
    pet.preferredVetId=proposal.data.providerId;proposal.resultId=pet.id;
  } else if (['set_meal_routine','stop_meal_routine'].includes(proposal.action)) {
    if(JSON.stringify(pet.mealRoutine||null)!==JSON.stringify(proposal.before.mealRoutine))throw new Problem('The meal routine changed. Please review a new choice.',409);
    const existing=account.events.filter(e=>e.petId===pet.id&&e.status==='planned'&&(e.routine==='meals'||(proposal.action==='set_meal_routine'&&/^(breakfast|dinner)$/i.test(e.title))));
    if(JSON.stringify(existing)!==JSON.stringify(proposal.before.events))throw new Problem('The meal reminders changed. Please review a new choice.',409);
    for(const event of existing)event.status='cancelled';
    if(proposal.action==='set_meal_routine'){
      pet.mealRoutine={...proposal.data};
      for(const [i,title] of ['Breakfast','Dinner'].entries())account.events.push({id:`${proposal.id}-${i}`,petId:pet.id,title,startAt:i?proposal.data.dinnerAt:proposal.data.breakfastAt,minutes:5,repeatDays:1,location:'Home',status:'planned',routine:'meals'});
    }else delete pet.mealRoutine;
    proposal.resultId=pet.id;
  }
  proposal.status = 'confirmed'; proposal.confirmedAt = new Date(now).toISOString();
  proposal.report=proposal.report||(proposal.action==='set_pet_settings'?`Saved ${pet.name}'s ${petSettingCategories[proposal.data.category].title.toLowerCase()} in their profile. No reminders or appointments were created.`
    :proposal.action==='set_pet_place'?`${proposal.data.saved?'Saved':'Removed'} ${providers.find(p=>p.id===proposal.data.providerId).name} ${proposal.data.saved?'in':'from'} ${pet.name}'s favourite places. No visit was booked.`
    :proposal.action==='add_shopping_items'?`Added ${proposal.data.items.map(i=>i.name).join(', ')} to ${shoppingLists(account).find(l=>l.id===proposal.data.listId).name}. Your shopping list is saved. No purchase was made.`
    :proposal.action==='set_supplies'?`Saved your preferred supplies stores. Offer alerts are ${proposal.data.saleAlerts?'on for connected feeds when the app refreshes; enable phone reminders for notifications':'off'}. No calendar events or purchases were made.`
    :proposal.action==='set_meal_routine'?`Saved ${pet.name}'s meal times in their profile and added breakfast and dinner reminders to the calendar. We're a team! Enable device reminders in the installed app for notifications.`
    :proposal.action==='stop_meal_routine'?`Removed ${pet.name}'s meal reminder times from their profile and cancelled both calendar reminders. Device reminders will update when each signed-in device refreshes.`
    :proposal.action==='set_preferred_vet'?`Saved ${providers.find(p=>p.id===proposal.data.providerId).name} as ${pet.name}'s preferred vet. No appointment was booked.`
    :proposal.action==='plan'?`Added ${proposal.data.title} to ${pet.name}'s calendar${proposal.data.repeatDays?`, repeating every ${proposal.data.repeatDays} day(s)`:''}. Enable device reminders in the installed app for notifications. This does not book a service.`
    :proposal.action==='remove_pet'?`Removed ${pet.name}'s profile, calendar events, reminders and conversations. Other devices update their reminders when they next refresh.`
    :proposal.action==='update_pet'?`Saved the reviewed details in ${pet.name}'s profile.`
    :proposal.action==='add_pet'?`Added ${proposal.data.name} to your pets. We're ready to get to know them.`
    :proposal.action==='save_service'?`Saved ${providers.find(p=>p.id===proposal.data.providerId).name} to your favourites.`
    :`Marked the activity complete${proposal.before.repeatDays?'; the next occurrence is in your calendar':''}.`);
  const after=proposal.action==='remove_pet'?null:proposal.action.includes('inventory')?(account.inventory||[]).find(i=>i.id===proposal.resultId)||null:account.events.find(e=>e.id===proposal.resultId)||account.pets.find(p=>p.id===proposal.resultId)||proposal.data;
  const careLinked=['complete_event','record_care'].includes(proposal.action),inventoryId=proposal.action==='complete_event'?proposal.before?.inventoryId:proposal.data.inventoryId;
  const auditBefore=proposal.action==='remove_pet'?null:careLinked?{event:proposal.action==='complete_event'?proposal.before:null,inventory:proposal.action==='complete_event'?proposal.data.inventoryBefore||null:proposal.before}:proposal.before;
  const auditAfter=careLinked?{event:after,inventory:(account.inventory||[]).find(i=>i.id===inventoryId)||null,nextCare:account.events.filter(e=>e.petId===proposal.petId&&e.status==='planned'&&e.title===after?.title).map(e=>({id:e.id,startAt:e.startAt,recurrence:e.recurrence||null}))}:after;
  account.audit=[...(account.audit||[]),{id:proposal.id,actorId:account._id,petId:proposal.petId,action:proposal.action,at:proposal.confirmedAt,source:proposal.source||'app',sourceConversation:proposal.sourceConversation||null,before:structuredClone(auditBefore),after:structuredClone(auditAfter)}].slice(-500);
  return proposal;
}

export function ideasFor(pet) {
  if (!pet) return [];
  const ideas = pet.species === 'Dog' ? ['A gentle sniff walk', 'Play at home', 'Practise one familiar cue']
    : pet.species === 'Horse' ? ['Quiet grooming time', 'Practise familiar groundwork', 'Check the paddock together']
    : pet.species === 'Bird' ? ['Familiar enrichment time', 'A short training game', 'Refresh the play space']
    : ['A little enrichment', 'Refresh their space', 'Quiet time together'];
  return ideas;
}
