import {randomUUID} from 'node:crypto';
import {Problem} from './domain.js';
import {careDateLabel,cleanRecurrence,inventoryEstimate,repeatLabel} from './care.js';

export const careActions=['record_care','update_event','cancel_event','snooze_event','save_inventory','purchase_inventory','remove_inventory','set_notification_preferences','dismiss_setup'];
const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Problem(`Check ${label}.`);return value.trim();};
const quantity=(v,label,optional=false)=>{if(optional&&v==null)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10000000)throw new Problem(`Check ${label}.`);return v;};
function date(value,now,future=true){if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value))||(future?Date.parse(value)<=now:Date.parse(value)>now+60000)||Date.parse(value)>now+730*86400000)throw new Problem(future?'Choose a future date and time.':'Choose when the quantity was recorded.');return new Date(value).toISOString();}
export function prepareCare(account,pet,action,input,now){
 let data,before=null,summary,details=[];
 if(action==='record_care'){
  data={title:text(input.title,150,'the care item'),completedAt:date(input.completedAt,now,false),recurrence:cleanRecurrence(input.recurrence),nextAt:input.nextAt?date(input.nextAt,now):null};
  if(data.recurrence&&!data.nextAt)throw new Problem('Choose the next due date for this care routine.');
  if(account.events.some(e=>e.petId===pet.id&&e.status==='planned'&&e.title.toLowerCase()===data.title.toLowerCase()))throw new Problem('This care item is already scheduled. Complete the existing item instead.',409);
  if(account.events.length+(data.nextAt?2:1)>1000)throw new Problem('The calendar has reached its event limit.');
  if(input.inventoryId){const item=(account.inventory||[]).find(i=>i.id===input.inventoryId&&i.petId===pet.id);const amount=quantity(input.quantityUsed,'quantity used');if(!item||item.dailyUse>0||amount<=0||!Number.isFinite(item.quantity)||item.quantity<amount)throw new Problem('Check the recorded supply and quantity used.');data.inventoryId=item.id;data.quantityUsed=amount;before=structuredClone(item);}
  summary=`Record ${pet.name}’s ${data.title}`;details=[['Completed at',data.completedAt],['Next due',data.nextAt||'Not scheduled'],['Repeats',repeatLabel({recurrence:data.recurrence,repeatDays:0})],...(before?[['Supply after completion',`${before.quantity-data.quantityUsed} ${before.unit}`]]:[])];
 }else if(['update_event','cancel_event','snooze_event'].includes(action)){
  const event=account.events.find(e=>e.id===input.eventId&&e.petId===pet.id&&e.status==='planned');if(!event)throw new Problem('That care item is no longer pending for this pet.',404);
  before=structuredClone(event);data={eventId:event.id};summary=`${action==='cancel_event'?'Cancel':action==='snooze_event'?'Remind later about':'Update'} ${event.title}`;
  if(action==='snooze_event')data.remindAt=date(input.remindAt,now);
  if(action==='update_event'){
   const changes=input.changes;if(!changes||typeof changes!=='object'||Array.isArray(changes))throw new Problem('Choose the details to change.');
   data.changes={};
   for(const [k,v] of Object.entries(changes)){
    if(k==='title')data.changes.title=text(v,150,'the activity');
    else if(k==='location'){if(typeof v!=='string'||v.length>300)throw new Problem('Check the place.');data.changes.location=v.trim();}
    else if(k==='startAt')data.changes.startAt=v===event.startAt?v:date(v,now);
    else if(k==='recurrence')data.changes.recurrence=cleanRecurrence(v);
    else if(k==='reminderMinutes'){if(!Number.isInteger(v)||v<0||v>43200)throw new Problem('Choose a reminder lead time up to 30 days.');data.changes.reminderMinutes=v;}
    else if(k==='priority'){if(!['important','helpful','optional'].includes(v))throw new Problem('Choose a notification category.');data.changes.priority=v;}
    else if(k==='inventoryId'){if(v!==null&&!(account.inventory||[]).some(i=>i.id===v&&i.petId===pet.id))throw new Problem('Choose this pet’s recorded supply.');data.changes.inventoryId=v;}
    else if(k==='quantityUsed'){const q=quantity(v,'the quantity used',true);if(q===0)throw new Problem('Choose a positive quantity per completion.');data.changes.quantityUsed=q;}
    else throw new Problem('That care field is not supported.');
   }
   if(!Object.keys(data.changes).length)throw new Problem('Choose a detail to change.');
   const merged={...event,...data.changes};
   if(merged.inventoryId&&(account.inventory||[]).find(i=>i.id===merged.inventoryId)?.dailyUse>0)throw new Problem('This supply already uses daily estimates; do not link a second consumption schedule.');
   if(Boolean(merged.inventoryId)!==Boolean(merged.quantityUsed))throw new Problem('Choose both a supply and its owner-recorded quantity per completion.');
   details=Object.entries(data.changes).map(([k,v])=>[k,k==='recurrence'?repeatLabel({recurrence:v,repeatDays:0}):String(v??'None')]);
  }
  details=[['Pet',pet.name],['Care',event.title],...details,...(data.remindAt?[['Remind at',data.remindAt]]:[]),['Scope',action==='cancel_event'?'Cancel this item and its future repeating care':'Changes only after confirmation']];
 }else if(['save_inventory','purchase_inventory','remove_inventory'].includes(action)){
  const existing=input.id&&(account.inventory||[]).find(i=>i.id===input.id&&i.petId===pet.id);
  if(input.id&&!existing)throw new Problem('That supply is not recorded for this pet.',404);
  if(action!=='save_inventory'&&!existing)throw new Problem('Choose a recorded supply.',404);
  before=existing?structuredClone(existing):null;
  if(action==='remove_inventory'){
   if(account.events.some(e=>e.status==='planned'&&e.inventoryId===existing.id))throw new Problem('Unlink this supply from its care schedule before removing it.');
   data={id:existing.id};summary=`Remove ${existing.product} from supplies`;details=[['Pet',pet.name],['History','Completed care history stays recorded']];
  }else if(action==='purchase_inventory'){
   const amount=quantity(input.quantity,'the purchase quantity');if(amount===0)throw new Problem('Enter the quantity bought.');
   const purchasedAt=date(input.purchasedAt,now,false);
   if(Date.parse(purchasedAt)<Date.parse(existing.quantityAt))throw new Problem('This purchase predates the latest stock correction. Correct the current quantity instead.');
   const estimate=inventoryEstimate(existing,Date.parse(purchasedAt));if(estimate.remaining===null)throw new Problem('Record the remaining quantity before adding a purchase.');
   data={id:existing.id,quantity:amount,purchasedAt,remaining:estimate.remaining};summary=`Record a purchase of ${existing.product}`;
   details=[['Pet',pet.name],['Added',`${amount} ${existing.unit}`],['Balance at purchase',`${estimate.remaining+amount} ${existing.unit}${estimate.kind==='estimated'?' (estimated)':''}`],['Purchase','Record only; no order is placed']];
  }else{
   if(!existing&&(account.inventory||[]).length>=200)throw new Problem('Your supplies list is full. Remove an unused entry first.');
   const merged={...existing,...input};
   if(!['food','medication','treatment','supplement','other'].includes(merged.category)||!['g','kg','ml','tablets','doses','items'].includes(merged.unit))throw new Problem('Choose a supply category and unit.');
   data={id:existing?.id||randomUUID(),petId:pet.id,product:text(merged.product,150,'the product'),category:merged.category,unit:merged.unit,quantity:quantity(merged.quantity,'the current quantity',true),dailyUse:quantity(merged.dailyUse,'daily use',true),quantityAt:date(merged.quantityAt||new Date(now).toISOString(),now,false),reorderDays:merged.reorderDays??7};
   if(!Number.isInteger(data.reorderDays)||data.reorderDays<0||data.reorderDays>90)throw new Problem('Choose a reorder lead time from 0 to 90 days.');
   if(['medication','treatment'].includes(data.category)&&data.dailyUse)throw new Problem('Link treatment stock to its confirmed care schedule. Daily estimates are for food and other supplies.');
   if(data.dailyUse>0&&existing&&account.events.some(e=>e.status==='planned'&&e.inventoryId===existing.id))throw new Problem('Unlink this supply from scheduled care before using daily estimates.');
   if(existing&&data.unit!==existing.unit)throw new Problem('Keep the recorded unit; create a separate supply to use a different unit.');
   summary=`${existing?'Correct':'Record'} ${data.product}`;
   details=[['Pet',pet.name],['Quantity',data.quantity===null?'Unknown':`${data.quantity} ${data.unit}`],['Daily use',data.dailyUse?`${data.dailyUse} ${data.unit} (owner recorded)`:'Not recorded'],['Estimate','Supply estimates can be corrected at any time']];
  }
 }else if(action==='set_notification_preferences'){
  before=structuredClone(account.notificationPreferences||{});data={};
  for(const k of ['important','helpful','optional']){if(typeof input[k]!=='boolean')throw new Problem('Choose your notification categories.');data[k]=input[k];}
  summary='Save notification preferences';details=Object.entries(data).map(([k,v])=>[k,v?'On':'Off']);
 }else if(action==='dismiss_setup'){data={};summary=`Hide ${pet.name}’s setup suggestions`;details=[['Pet',pet.name],['Later','You can still add these details through Pip or the profile.']];}
 return {data,before,summary,details};
}
export function applyCare(account,pet,proposal,now){
 const {action,data,before}=proposal;
 if(action==='record_care'){
  if(data.inventoryId){const item=(account.inventory||[]).find(i=>i.id===data.inventoryId&&i.petId===pet.id);if(JSON.stringify(item)!==JSON.stringify(before))throw new Problem('Supply changed. Review the care record again.',409);item.quantity-=data.quantityUsed;item.quantityAt=new Date(now).toISOString();}
  const e={id:proposal.id,petId:pet.id,title:data.title,startAt:data.completedAt,minutes:5,repeatDays:0,location:'',status:'completed',completedAt:data.completedAt,completedBy:account._id,...(data.inventoryId?{inventoryId:data.inventoryId,quantityUsed:data.quantityUsed}:{})};
  account.events.push(e);
  if(data.nextAt)account.events.push({...e,id:randomUUID(),status:'planned',startAt:data.nextAt,recurrenceAnchor:data.nextAt,recurrence:data.recurrence,completedAt:undefined,completedBy:undefined});
  proposal.resultId=e.id;proposal.report=`Recorded ${data.title} for ${pet.name}.${data.nextAt?` Next due ${careDateLabel(data.nextAt,proposal.timezone)}.`:''}${data.inventoryId?` Supply remaining: ${before.quantity-data.quantityUsed} ${before.unit}.`:''}`;
 }else if(['update_event','cancel_event','snooze_event'].includes(action)){
  const e=account.events.find(e=>e.id===data.eventId&&e.petId===pet.id);if(JSON.stringify(e)!==JSON.stringify(before))throw new Problem('This care item changed. Review it again.',409);
  if(action==='cancel_event'){e.status='cancelled';e.cancelledAt=new Date(now).toISOString();}
  if(action==='snooze_event')e.snoozedUntil=data.remindAt;
  if(action==='update_event'){
   Object.assign(e,data.changes);delete e.snoozedUntil;
   if('recurrence' in data.changes)e.repeatDays=0;
   if('recurrence' in data.changes||'startAt' in data.changes)e.recurrenceAnchor=e.startAt;
  }
  proposal.resultId=e.id;proposal.report=`${action==='cancel_event'?'Cancelled':action==='snooze_event'?'Saved a later reminder for':'Updated'} ${e.title} for ${pet.name}.${action==='cancel_event'?' No future repeats will be created.':' Your care calendar is updated.'}`;
 }else if(['save_inventory','purchase_inventory','remove_inventory'].includes(action)){
  account.inventory??=[];const i=account.inventory.find(i=>i.id===data.id&&i.petId===pet.id);
  if(JSON.stringify(i||null)!==JSON.stringify(before))throw new Problem('This supply changed. Review its latest quantity.',409);
  if(action==='save_inventory'){if(i)Object.assign(i,data);else account.inventory.push({...data});}
  if(action==='purchase_inventory'){i.quantity=data.remaining+data.quantity;i.quantityAt=data.purchasedAt;i.lastPurchaseAt=data.purchasedAt;}
  if(action==='remove_inventory')account.inventory=account.inventory.filter(i=>i.id!==data.id);
  proposal.resultId=data.id;proposal.report=action==='remove_inventory'?'Removed the supply entry.':`Saved ${action==='purchase_inventory'?'the purchase':'the reviewed quantity'} for ${pet.name}. Supply estimates now use the updated record. No purchase was placed.`;
 }else if(action==='set_notification_preferences'){
  if(JSON.stringify(account.notificationPreferences||{})!==JSON.stringify(before))throw new Problem('Preferences changed. Review them again.',409);
  account.notificationPreferences=data;proposal.report='Saved your notification categories. Device permissions still control delivery.';
 }else if(action==='dismiss_setup'){pet.setupDismissed=true;proposal.report='Hidden these setup suggestions. You can add care details whenever you like.';}
}
