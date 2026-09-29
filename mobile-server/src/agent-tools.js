import {Problem} from './domain.js';
import {inventoryEstimate} from './care.js';
import {petSettingCategories} from './pet-settings.js';
// Owner-scoped read tools. Mutations continue through offer_choice and confirmation.
export function agentReadTools(account,pet,providers){
 const schema=(name,description,properties={})=>({type:'function',name,description,strict:true,parameters:{type:'object',properties,required:Object.keys(properties),additionalProperties:false}});
 const definitions=[
  schema('get_pet_profile','Read the selected pet profile and full saved care notes when the initial context is insufficient. Other pets are excluded.'),
  schema('get_pet_care','Read an existing care category for the selected pet. Missing values are unknown.',{category:{type:'string',enum:Object.keys(petSettingCategories)}}),
  schema('get_care_schedule','Read upcoming, overdue and recently completed care for this pet.'),
  schema('get_inventory','Read recorded supplies and calculated estimates for this pet.'),
  schema('search_directory','Search the existing app directory. Results are listings, not live availability or confirmed emergency services.',{query:{type:'string'},category:{type:'string'}}),
  schema('list_documents','List document references for this pet. Does not retrieve or invent file contents.'),
 ];
 function execute(name,args){
  if(!args||typeof args!=='object'||Array.isArray(args))throw new Problem('Pip could not read those details.',503);
  if(name==='get_pet_profile')return {profile:pet?Object.fromEntries(['id','name','species','breed','age','social','training','goals','careNotes','preferredVetId','mealRoutine'].map(k=>[k,pet[k]])):null,source:'owner-recorded'};
  if(name==='get_pet_care'){if(!petSettingCategories[args.category])throw new Problem('Unknown care category.',503);return {category:args.category,values:pet?.careSettings?.[args.category]||{},source:'owner-recorded',schema:petSettingCategories[args.category]};}
  if(name==='get_care_schedule')return {events:[...account.events.filter(e=>e.petId===pet?.id&&e.status==='planned').sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).slice(0,40),...account.events.filter(e=>e.petId===pet?.id&&e.status==='completed').sort((a,b)=>Date.parse(b.completedAt||b.startAt)-Date.parse(a.completedAt||a.startAt)).slice(0,10)]};
  if(name==='get_inventory')return {inventory:(account.inventory||[]).filter(i=>i.petId===pet?.id).slice(0,100).map(i=>({...i,estimate:inventoryEstimate(i)}))};
  if(name==='list_documents')return {documents:(account.documents||[]).filter(d=>d.petId===pet?.id).map(({id,title,category})=>({id,title,category})),fileAccess:false};
  if(name==='search_directory'){
   if(typeof args.query!=='string'||args.query.length>120||typeof args.category!=='string'||args.category.length>30)throw new Problem('Check the directory search.',503);
   const q=args.query.toLowerCase();return {places:providers.filter(p=>(!args.category||p.category===args.category)&&`${p.name} ${p.address||''}`.toLowerCase().includes(q)).slice(0,15).map(p=>({id:p.id,name:p.name,category:p.category,address:p.address||null,phone:p.phone||null,website:p.website||null,supportedAnimals:p.species_supported||[],lastVerified:p.lastVerified||null})),location:'No live user location supplied; ask for an area only if needed.'};
  }
  throw new Problem('That read tool is unavailable.',503);
 }
 return {definitions,execute};
}
