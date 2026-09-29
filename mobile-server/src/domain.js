import { attentionItems } from './attention.js';
import { randomUUID } from 'node:crypto';

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
    shopping: account.shopping || [],
    attention: attentionItems(account).filter(item=>!(account.dismissedAttention||[]).includes(item.id)),
    dismissedAttention: account.dismissedAttention || [],
    supplies: account.supplies || {stores:[],saleAlerts:false},
    proposals: account.proposals.filter(p => p.status === 'pending' && Date.parse(p.expiresAt) > Date.now()), messages: account.messages };
}
export function prepare(account, input, providers, now = Date.now()) {
  const action = input.action;
  const pet = account.pets.find(p => p.id === input.petId);
  if (!['add_pet','set_supplies','save_service'].includes(action) && !pet) throw new Problem('Select one of your pets.', 404);
  let data, before = null, summary, details;
  if (action === 'set_supplies') {
    const stores=input.data?.stores;
    if(!Array.isArray(stores)||stores.length>5||typeof input.data.saleAlerts!=='boolean')throw new Problem('Choose up to five stores and an alert preference.');
    data={stores:stores.map(store=>{const provider=store?.providerId?providers.find(p=>p.id===store.providerId&&p.category==='shop'):null;if(store?.providerId&&!provider)throw new Problem('Choose a supplies store from the directory.',404);if(provider)store={name:provider.name,website:provider.website,address:provider.address,providerId:provider.id};const name=string(store?.name,100,'the store name');const website=string(store?.website||'',300,'the store website',false);if(website){let url;try{url=new URL(website);}catch{throw new Problem('Enter a full https:// store website.');}if(url.protocol!=='https:'||url.username||url.password)throw new Problem('Use an HTTPS store website without sign-in details.');}return {name,website,...(store.address?{address:string(store.address,300,'the store address')}:{}),...(provider?{providerId:provider.id}:{})};}),saleAlerts:input.data.saleAlerts};
    if(new Set(data.stores.map(s=>`${s.name.toLowerCase()}|${s.website.toLowerCase()}|${s.address||''}`)).size!==stores.length)throw new Problem('This store is already in your list.');
    before=structuredClone(account.supplies||{stores:[],saleAlerts:false});summary='Your supplies stores';
    details=[...data.stores.map(s=>['Store',[s.name,s.address,s.website].filter(Boolean).join(' ? ')]),['Offer alerts',data.saleAlerts?'On, for connected feeds when the app refreshes':'Off'],['Calendar','Sale reminders are added only when you review and confirm them']];
  } else if (action === 'add_pet' || action === 'update_pet') {
    data = cleanPet({ ...pet, ...input.data });
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
    summary = `${title} with ${pet.name}`;
    details = [['Activity', title], ['When', data.startAt], ['Minutes', String(minutes)], ['Place', data.location || 'Not decided'], ['Repeats', repeatDays ? `Every ${repeatDays} days` : 'Once'], ['Reminder', 'At the start, on devices where you enable reminders']];
    if (account.events.length >= 1000) throw new Problem('The calendar has reached its current event limit.');
  } else if (action === 'complete_event') {
    const event = account.events.find(e => e.id === input.data?.eventId && e.petId === pet.id && e.status === 'planned');
    if (!event) throw new Problem('That event is not pending for this pet.', 404);
    data = { eventId: event.id }; before = structuredClone(event);
    summary = `Mark ${event.title} complete`;
    details = [['Pet', pet.name], ['Activity', event.title], ['Repeats', event.repeatDays ? `Schedules the next occurrence in ${event.repeatDays} days` : 'No repeat']];
  } else if (action === 'save_service') {
    const provider = providers.find(p => p.id === input.data?.providerId);
    if (!provider) throw new Problem('Choose a service from the directory.', 404);
    data = { providerId: provider.id }; summary = `Save ${provider.name}`;
    details = [['Service', provider.name], ['Address', provider.address || 'Not recorded']];
  } else throw new Problem('That action is not supported.');
  return { id: randomUUID(), action, petId: pet?.id ?? null, data, before, summary, details, status: 'pending', createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 30 * 60000).toISOString() };
}
export function stage(account, input, providers, replaceId) {
  const previous = replaceId && account.proposals.find(p => p.id === replaceId && p.status === 'pending');
  if (replaceId && (!previous || Date.parse(previous.expiresAt) <= Date.now())) throw new Problem('That choice has expired or has already been handled.', 409);
  const proposal = prepare(account, input, providers);
  account.proposals = account.proposals.filter(p => p.status === 'pending' && Date.parse(p.expiresAt) > Date.now()).slice(-29);
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
  prepare(account, proposal, providers, now);
  const pet = account.pets.find(p => p.id === proposal.petId);
  if (proposal.action === 'update_pet' && JSON.stringify(pet) !== JSON.stringify(proposal.before)) throw new Problem('This pet profile changed. Please review a new choice.', 409);
  if (proposal.action === 'set_supplies') {
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
    for(const key of Object.keys(account.messages))if(key===pet.id||key.startsWith(`${pet.id}::`))delete account.messages[key];
    account.proposals=account.proposals.filter(p=>p.petId!==pet.id||p.id===proposal.id);
    proposal.before=null;proposal.resultId=pet.id;
  } else if (proposal.action === 'plan') {
    account.events.push({ ...proposal.data, id: proposal.id, petId: pet.id, status: 'planned' }); proposal.resultId = proposal.id;
  } else if (proposal.action === 'complete_event') {
    const event = account.events.find(e => e.id === proposal.data.eventId);
    if (JSON.stringify(event) !== JSON.stringify(proposal.before)) throw new Problem('This event changed. Please review a new choice.', 409);
    if (event.repeatDays && account.events.length >= 1000) throw new Problem('The calendar has reached its current event limit.');
    event.status = 'completed'; event.completedAt = new Date(now).toISOString();
    if (event.repeatDays) account.events.push({ ...event, id: randomUUID(), status: 'planned', completedAt: undefined, startAt: new Date(Date.parse(event.startAt) + Math.max(1, Math.floor((now-Date.parse(event.startAt))/(event.repeatDays*86400000))+1) * event.repeatDays * 86400000).toISOString() });
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
  proposal.report=proposal.action==='set_supplies'?`Saved your preferred supplies stores. Offer alerts are ${proposal.data.saleAlerts?'on for connected feeds when the app refreshes; enable phone reminders for notifications':'off'}. No calendar events or purchases were made.`
    :proposal.action==='set_meal_routine'?`Saved ${pet.name}'s meal times in their profile and added breakfast and dinner reminders to the calendar. We're a team! Enable device reminders in the installed app for notifications.`
    :proposal.action==='stop_meal_routine'?`Removed ${pet.name}'s meal reminder times from their profile and cancelled both calendar reminders. Device reminders will update when each signed-in device refreshes.`
    :proposal.action==='set_preferred_vet'?`Saved ${providers.find(p=>p.id===proposal.data.providerId).name} as ${pet.name}'s preferred vet. No appointment was booked.`
    :proposal.action==='plan'?`Added ${proposal.data.title} to ${pet.name}'s calendar${proposal.data.repeatDays?`, repeating every ${proposal.data.repeatDays} day(s)`:''}. Enable device reminders in the installed app for notifications. This does not book a service.`
    :proposal.action==='remove_pet'?`Removed ${pet.name}'s profile, calendar events, reminders and conversations. Other devices update their reminders when they next refresh.`
    :proposal.action==='update_pet'?`Saved the reviewed details in ${pet.name}'s profile.`
    :proposal.action==='add_pet'?`Added ${proposal.data.name} to your pets. We're ready to get to know them.`
    :proposal.action==='save_service'?`Saved ${providers.find(p=>p.id===proposal.data.providerId).name} to your favourites.`
    :`Marked the activity complete${proposal.before.repeatDays?'; the next occurrence is in your calendar':''}.`;
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
