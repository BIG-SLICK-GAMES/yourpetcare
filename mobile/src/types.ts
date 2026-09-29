export type Pet = { id: string; name: string; species: string; breed: string; age: string; social: string; training: string; goals: string; careNotes?:string; preferredVetId?:string; mealRoutine?:{breakfastAt:string;dinnerAt:string} };
export type Event = { id: string; petId: string; title: string; startAt: string; minutes: number; repeatDays: number; location: string; status: 'planned' | 'completed' | 'cancelled' };
export type Provider = { id: string; name: string; category: string; address: string; lat: number; lon: number; website: string; phone: string; source: string; species_supported: string[]; pet_policy: string };
export type ProposalInput = { action: 'remove_pet' | 'set_supplies' | 'add_pet' | 'update_pet' | 'plan' | 'save_service' | 'set_preferred_vet' | 'set_meal_routine' | 'stop_meal_routine' | 'complete_event'; petId?: string | null; data: Record<string, unknown>; replaceId?: string };
export type Proposal = ProposalInput & { id: string; summary: string; details: [string,string][]; status: string; expiresAt: string; resultId?: string; report?:string };
export type Message = { role: 'user' | 'assistant'; content: string; navigation?:{screen:'map';mode:'walk';minutes?:number;stop?:'none'|'rest'|'cafe'|'friends'} };
export type MapPoint = {lat:number;lon:number};
export type WalkRoute = {id:string;distance:number;minutes:number;geometry:{type:'LineString';coordinates:[number,number][]}};
export type ShoppingItem = {id:string;name:string;store:string;done:boolean};
export type ShoppingChange = {action:'add';name:string;store:string}|{action:'check';id:string;done:boolean}|{action:'remove';id:string};
export type Account = { shopping?:ShoppingItem[]; id: string; username: string; supplies?: SupplyPreferences; pets: Pet[]; events: Event[]; saved: string[]; proposals: Proposal[]; messages: Record<string, Message[]> };
export type Catalog = { providers: Provider[]; supplyStores?:SupplySource[]; species: string[]; aiAvailable: boolean; weatherAvailable: boolean; crowdsAvailable: boolean };

export type SupplyPreferences={stores:{name:string;website:string;address?:string;providerId?:string}[];saleAlerts:boolean};
export type SupplySource={id:string;name:string;website:string;offersUrl:string;label:string;verifiedAt:string};
export type SupplyOffer={id:string;storeId:string;storeName:string;title:string;url:string;source:string;datesKnown:boolean};
export type SupplyFeed={storeId:string;status:'connected'|'unavailable';checkedAt:string;offers:SupplyOffer[]};
