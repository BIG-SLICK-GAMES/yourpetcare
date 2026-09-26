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
  };
}
export function initialAccount(username, passwordHash) {
  return { _id: randomUUID(), username, passwordHash, version: 0, pets: [], events: [], proposals: [], saved: [], messages: {}, tokens: [], createdAt: new Date().toISOString() };
}
export function accountView(account) {
  return { id: account._id, username: account.username, pets: account.pets, events: account.events, saved: account.saved,
    proposals: account.proposals.filter(p => p.status === 'pending' && Date.parse(p.expiresAt) > Date.now()), messages: account.messages };
}
export function prepare(account, input, providers, now = Date.now()) {
  const action = input.action;
  const pet = account.pets.find(p => p.id === input.petId);
  if (action !== 'add_pet' && !pet) throw new Problem('Select one of your pets.', 404);
  let data, before = null, summary, details;
  if (action === 'add_pet' || action === 'update_pet') {
    data = cleanPet(input.data ?? {});
    if (action === 'add_pet' && account.pets.length >= 30) throw new Problem('This account has reached its pet limit.');
    before = pet ? structuredClone(pet) : null;
    summary = action === 'add_pet' ? `Meet ${data.name}` : `Remember this about ${data.name}`;
    details = [['Name', data.name], ['Animal', data.species], ['Breed / kind', data.breed || 'Not recorded'], ['Age', data.age || 'Not recorded'], ['Comfort', data.social], ['Training', data.training], ['Together', data.goals || 'Still exploring']];
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
  if (decision === 'cancel') { proposal.status = 'cancelled'; return proposal; }
  if (Date.parse(proposal.expiresAt) <= now) throw new Problem('This choice has expired. Please make a new one.', 409);
  // Validate again using current owner data before applying any change.
  prepare(account, proposal, providers, now);
  const pet = account.pets.find(p => p.id === proposal.petId);
  if (proposal.action === 'update_pet' && JSON.stringify(pet) !== JSON.stringify(proposal.before)) throw new Problem('This pet profile changed. Please review a new choice.', 409);
  if (proposal.action === 'add_pet') {
    account.pets.push({ ...proposal.data, id: proposal.id });
    proposal.resultId = proposal.id;
  } else if (proposal.action === 'update_pet') {
    Object.assign(pet, proposal.data); proposal.resultId = pet.id;
  } else if (proposal.action === 'plan') {
    account.events.push({ ...proposal.data, id: proposal.id, petId: pet.id, status: 'planned' }); proposal.resultId = proposal.id;
  } else if (proposal.action === 'complete_event') {
    const event = account.events.find(e => e.id === proposal.data.eventId);
    if (JSON.stringify(event) !== JSON.stringify(proposal.before)) throw new Problem('This event changed. Please review a new choice.', 409);
    if (event.repeatDays && account.events.length >= 1000) throw new Problem('The calendar has reached its current event limit.');
    event.status = 'completed'; event.completedAt = new Date(now).toISOString();
    if (event.repeatDays) account.events.push({ ...event, id: randomUUID(), status: 'planned', completedAt: undefined, startAt: new Date(Date.parse(event.startAt) + event.repeatDays * 86400000).toISOString() });
    proposal.resultId = event.id;
  } else if (proposal.action === 'save_service') {
    if (!account.saved.includes(proposal.data.providerId)) account.saved.push(proposal.data.providerId);
    proposal.resultId = proposal.data.providerId;
  }
  proposal.status = 'confirmed'; proposal.confirmedAt = new Date(now).toISOString();
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
