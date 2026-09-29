import {Problem} from './domain.js';
export function recurrenceFor(event) {
 return event.recurrence || (event.repeatDays?{unit:'day',interval:event.repeatDays}:null);
}
export function cleanRecurrence(value) {
 if(value==null)return null;
 if(!['day','week','month','year'].includes(value.unit)||!Number.isInteger(value.interval)||value.interval<1||value.interval>365)throw new Problem('Choose a valid care interval.');
 return {unit:value.unit,interval:value.interval};
}
export function occurrenceAt(event, index) {
 const rule=recurrenceFor(event),base=new Date(event.recurrenceAnchor||event.startAt);
 if(!rule)return Date.parse(event.startAt);
 if(rule.unit==='day'||rule.unit==='week')return base.getTime()+index*rule.interval*(rule.unit==='week'?7:1)*86400000;
 const months=index*rule.interval*(rule.unit==='year'?12:1),day=base.getUTCDate();
 base.setUTCDate(1);base.setUTCMonth(base.getUTCMonth()+months);
 const end=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate();
 base.setUTCDate(Math.min(day,end));return base.getTime();
}
export function nextOccurrence(event, after) {
 const rule=recurrenceFor(event);if(!rule)return null;
 const anchor=Date.parse(event.recurrenceAnchor||event.startAt);
 let index=Math.max(1,Math.floor((after-anchor)/(rule.interval*(rule.unit==='year'?366:rule.unit==='month'?31:rule.unit==='week'?7:1)*86400000)));
 // At most a few corrections for calendar months; bounded for malformed legacy dates.
 for(let tries=0;tries<10000;tries++,index++){const at=occurrenceAt(event,index);if(at>after)return new Date(at).toISOString();}
 throw new Problem('Please review this repeating care schedule.');
}
export function repeatLabel(event) {const r=recurrenceFor(event);return r?`Every ${r.interval} ${r.unit}${r.interval===1?'':'s'}`:'Once';}
export function carePriority(event){return event.priority||(/medic|worm|flea|tick|vaccin|vet|appoint|treatment/i.test(event.title)?'important':'helpful');}
export function inventoryEstimate(item, now=Date.now()) {
 if(!Number.isFinite(item.quantity)||item.quantity<0)return {kind:'unknown',remaining:null,days:null};
 if(!Number.isFinite(item.dailyUse)||item.dailyUse<=0)return {kind:'recorded',remaining:item.quantity,days:null};
 const at=Date.parse(item.quantityAt);if(!Number.isFinite(at))return {kind:'unknown',remaining:null,days:null};
 const elapsed=Math.max(0,(now-at)/86400000),remaining=Math.max(0,item.quantity-elapsed*item.dailyUse);
 const depletion=new Date(at+item.quantity/item.dailyUse*86400000);
 return {kind:'estimated',remaining:Math.round(remaining*100)/100,days:Math.max(0,Math.floor(remaining/item.dailyUse)),...(Number.isFinite(depletion.getTime())?{depletionAt:depletion.toISOString()}:{})};
}
export function careInsights(account, now=Date.now()) {
 return (account.inventory||[]).flatMap(item=>{
  const estimate=inventoryEstimate(item,now),next=account.events.filter(e=>e.status==='planned'&&e.petId===item.petId&&e.inventoryId===item.id).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt))[0];
  let title;
  if(estimate.days!==null&&estimate.days<=(item.reorderDays??7))title=`${item.product} may last about ${estimate.days} more days`;
  else if(estimate.remaining===0)title=`${item.product}: no supply recorded`;
  else if(next&&Number.isFinite(next.quantityUsed)&&item.quantity===next.quantityUsed)title=`${item.product}: enough recorded for the next care item, then none left`;
  return title?[{id:'stock:'+item.id,petId:item.petId,inventoryId:item.id,title,kind:estimate.kind}]:[];
 }).slice(0,3);
}

export function careDateLabel(value,timezone='UTC'){
 try{return new Date(value).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric',timeZone:timezone});}catch{return new Date(value).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});}
}
