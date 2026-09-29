import { Problem, species, ideasFor } from './domain.js';
import { petSettingCategories } from './pet-settings.js';
import { shoppingLists, shoppingItems } from './shopping.js';

const topics = {
 health: /worm|flea|tick|medic|vaccin|dose|tablet|symptom|sick|vomit|allerg|dental|vet|treatment/i,
 feeding: /food|feed|eats|meal|breakfast|dinner|bag|suppl|inventory|stock|pack|purchas|bought|quantity/i,
 calendar: /when|due|coming up|today|tomorrow|appoint|schedule|calendar|remind|complete|done|reschedul|cancel|wormed/i,
 places: /find|nearby|near me|where|groomer|vet|cafe|café|restaurant|park|hotel|store|shop|directory/i,
 outing: /walk|outing|dining|lunch|dinner out|cafe|café|restaurant|play|travel|holiday|training|sport/i,
 shopping: /list|shop|buy|reorder|suppl|food|pack|stock|bought|purchase/i,
 documents: /document|certificate|record|insurance|microchip/i,
};
export function detectIntent(message, section='general') {
 const labels=Object.entries(topics).filter(([,pattern])=>pattern.test(message)).map(([name])=>name);
 if(section==='shopping'&&!labels.includes('shopping'))labels.push('shopping');
 if(section==='calendar'&&!labels.includes('calendar'))labels.push('calendar');
 return {labels,household:/^(?:what(?:'s| is) coming up|what do (?:my|our) pets need)(?:\?| today)?[?.!]*$/i.test(message.trim())||/all (?:my |our )?pets|household/i.test(message)};
}
export function resolvePet(account, selectedId, message) {
 if(selectedId&&!account.pets.some(p=>p.id===selectedId))throw new Problem('Choose one of your pets.',404);
 const matches=account.pets.filter(p=>new RegExp('(?:^|\\W)'+p.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|\\W)','i').test(message));
 if(matches.length>1)return {pet:null,ambiguous:true};
 return {pet:matches[0]||account.pets.find(p=>p.id===selectedId)||(account.pets.length===1?account.pets[0]:null),ambiguous:!matches.length&&!selectedId&&account.pets.length>1};
}
export function buildAgentContext(account, pet, providers, message, {section='general',now=Date.now()}={}) {
 const intent=detectIntent(message,section),has=(label)=>intent.labels.includes(label);
 const categories=new Set(['home']);
 if(has('health'))for(const c of ['health','emergency','grooming'])categories.add(c);
 if(has('feeding')||has('shopping'))categories.add('feeding');
 if(has('outing'))for(const c of ['dining','walks','parks','activities','travel','health'])categories.add(c);
 const settings=Object.fromEntries(Object.entries(pet?.careSettings||{}).filter(([c])=>categories.has(c)));
 const petData=pet?Object.fromEntries(['id','name','species','breed','age','social','training','goals'].map(k=>[k,pet[k]])):null;
 if(petData){petData.careSettings=settings;if(has('feeding'))petData.mealRoutine=pet.mealRoutine;if(intent.labels.length)petData.careNotes=(pet.careNotes||'').slice(0,1800);}
 const vet=providers.find(p=>p.id===pet?.preferredVetId);
 const cat=/emergency|vet/i.test(message)?'vet':/groom/i.test(message)?'groomer':/cafe|café|lunch|restaurant/i.test(message)?'cafe':/park/i.test(message)?'park':/store|shop|food/i.test(message)?'shop':null;
 const services=has('places')?providers.filter(p=>(!cat||p.category===cat)&&(!p.species_supported?.length||!pet||p.species_supported.includes(pet.species))).slice(0,24).map(p=>({id:p.id,name:p.name,category:p.category,address:p.address||null,website:p.website||null,species:p.species_supported||[]})):[];
 const events=account.events.filter(e=>e.petId===pet?.id&&e.status==='planned').sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).slice(0,24);
 const selectedProposals=account.proposals.filter(p=>p.petId===(pet?.id||null));
 return {agentVersion:2,now:new Date(now).toISOString(),intent,pet:petData,species,ideas:ideasFor(pet),
  user:{name:account.preferences?.displayName||account.username,preferences:account.preferences||{},notificationPreferences:account.notificationPreferences||{}},
  settingCategories:Object.fromEntries(Object.entries(petSettingCategories).filter(([key])=>categories.has(key))),
  preferredVet:vet?{id:vet.id,name:vet.name,phone:vet.phone||null}:null,
  favouritePlaces:providers.filter(p=>pet?.favouritePlaceIds?.includes(p.id)).slice(0,10).map(p=>({id:p.id,name:p.name,category:p.category})),
  events:has('calendar')||has('health')||has('outing')?events:[],
  recentCare:has('health')?account.events.filter(e=>e.petId===pet?.id&&e.status==='completed').slice(-5):[],
  pendingChoices:selectedProposals.filter(p=>p.status==='pending'&&Date.parse(p.expiresAt)>now).slice(-4).map(p=>({id:p.id,action:p.action,data:p.data,status:p.status})),
  recentChoices:selectedProposals.filter(p=>p.status!=='pending').slice(-3).map(p=>({action:p.action,status:p.status,report:p.report})),
  inventory:has('health')||has('feeding')||has('shopping')?(account.inventory||[]).filter(i=>i.petId===pet?.id):[],
  documents:has('documents')?(account.documents||[]).filter(d=>d.petId===pet?.id).map(({id,title,category})=>({id,title,category})):[],
  shopping:has('shopping')?shoppingItems(account).slice(0,30):[],shoppingLists:has('shopping')?shoppingLists(account):[],
  supplies:has('shopping')?account.supplies||{stores:[],saleAlerts:false}:undefined,services,
  careGaps:pet?[!pet.preferredVetId&&'preferred vet',!pet.mealRoutine&&'feeding routine'].filter(Boolean):[],
  contextSources:[...categories,...intent.labels],weather:'Only verify a forecast for an owner-provided location/date.',crowds:'No live crowd data.'};
}

// Narrow, read-only patterns: no model invocation and no mutation for a known schedule.
export function deterministicCareReply(account, pet, message, timezone='Australia/Brisbane',now=Date.now()) {
 if(/\b(add|change|cancel|book|reschedule|complete|record|remove|remind|save)\b/i.test(message))return null;
 const household=detectIntent(message).household;
 const topic=/worm/i.test(message)?/worm/i:/vaccin/i.test(message)?/vaccin/i:/groom/i.test(message)?/groom/i:null;
 if(!household&&(!/^(when|what date|what time)/i.test(message.trim())||!topic))return null;
 const events=account.events.filter(e=>e.status==='planned'&&(household||e.petId===pet?.id)&&(!topic||topic.test(e.title))).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));
 if(!events.length)return {reply:household?'Nothing is on the care calendar yet. Tell me about one upcoming care task and I can prepare it.':`I don’t have that care item recorded for ${pet?.name||'your pet'} yet. When is it due?`,input:null};
 const date=e=>new Intl.DateTimeFormat('en-AU',{timeZone:timezone,weekday:'long',day:'numeric',month:'long',hour:'numeric',minute:'2-digit'}).format(new Date(e.startAt));
 let reply=events.slice(0,household?4:1).map(e=>`${account.pets.find(p=>p.id===e.petId)?.name}: ${e.title}, ${date(e)}${Date.parse(e.startAt)<now?' (overdue)':''}.`).join(' ');
 const event=events[0],item=(account.inventory||[]).find(i=>i.id===event.inventoryId&&i.petId===event.petId);
 if(item&&Number.isFinite(item.quantity)&&Number.isFinite(event.quantityUsed)&&event.quantityUsed>0&&item.quantity===event.quantityUsed)reply+=' You recorded enough for this dose; you’ll need more before the following one.';
 return {reply,input:null};
}
