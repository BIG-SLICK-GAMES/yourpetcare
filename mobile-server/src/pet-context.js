import {petSettingCategories} from './pet-settings.js';
import {shoppingLists} from './shopping.js';
import { Problem, ideasFor, species } from './domain.js';

// Selected-owner context only; no response generation or mutations.
export function agentFacts(account, petId, providers) {
  const pet = account.pets.find(p => p.id === petId) || null;
  if (!pet && (petId || account.pets.length)) throw new Problem('Choose a pet first.', 404);
  return { now: new Date().toISOString(), pet, ideas: ideasFor(pet),
    settingCategories:petSettingCategories, favouritePlaces:providers.filter(p=>pet?.favouritePlaceIds?.includes(p.id)).map(p=>({id:p.id,name:p.name,category:p.category,address:p.address})),
    pendingChoices: account.proposals.filter(p=>p.status==='pending'&&Date.parse(p.expiresAt)>Date.now()&&(p.petId===pet?.id||(!pet&&p.action==='add_pet'))).map(p=>({id:p.id,action:p.action,status:p.status,data:p.data})),
    recentChoices: account.proposals.filter(p=>p.status!=='pending'&&p.petId===pet?.id).slice(-4).map(p=>({action:p.action,status:p.status,data:p.data})),
    supplies: account.supplies || {stores:[],saleAlerts:false},
    shopping: account.shopping || [], shoppingLists: shoppingLists(account),
    preferredVet: providers.find(p=>p.id===pet?.preferredVetId) || null,
    careGaps: pet ? [!pet.preferredVetId && 'preferred vet', !pet.mealRoutine && 'feeding routine', !pet.age && 'age', pet.social==='unknown' && 'confidence', !pet.careNotes && 'routine and preferences'].filter(Boolean) : [],
    species, events: account.events.filter(e => e.petId === pet?.id && e.status === 'planned').sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).slice(0, 12),
    services: providers.map(p => ({ id: p.id, name: p.name, category: p.category, address: p.address, website:p.website, species: p.species_supported })),
    weather: 'No continuous weather feed. Use web search for a forecast when location and date are known.', crowds: 'No park crowd information is available.' };
}

