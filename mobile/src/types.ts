export type Pet = { id: string; name: string; species: string; breed: string; age: string; social: string; training: string; goals: string };
export type Event = { id: string; petId: string; title: string; startAt: string; minutes: number; repeatDays: number; location: string; status: 'planned' | 'completed' };
export type Provider = { id: string; name: string; category: string; address: string; lat: number; lon: number; website: string; phone: string; source: string; species_supported: string[]; pet_policy: string };
export type ProposalInput = { action: 'add_pet' | 'update_pet' | 'plan' | 'save_service' | 'complete_event'; petId?: string | null; data: Record<string, unknown>; replaceId?: string };
export type Proposal = ProposalInput & { id: string; summary: string; details: [string,string][]; status: string; expiresAt: string; resultId?: string };
export type Message = { role: 'user' | 'assistant'; content: string };
export type Account = { id: string; username: string; pets: Pet[]; events: Event[]; saved: string[]; proposals: Proposal[]; messages: Record<string, Message[]> };
export type Catalog = { providers: Provider[]; species: string[]; aiAvailable: boolean; weatherAvailable: boolean; crowdsAvailable: boolean };
