import type {Event,Recurrence} from './types';
export const recurrenceFor=(e:Event):Recurrence|null=>e.recurrence||(e.repeatDays?{unit:'day',interval:e.repeatDays}:null);
export function occurrenceAt(e:Event,index:number){
 const r=recurrenceFor(e),d=new Date(e.recurrenceAnchor||e.startAt);if(!r)return Date.parse(e.startAt);
 if(r.unit==='day'||r.unit==='week')return d.getTime()+index*r.interval*(r.unit==='week'?7:1)*86400000;
 const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+index*r.interval*(r.unit==='year'?12:1));d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));return d.getTime();
}
export const repeatLabel=(e:Event)=>{const r=recurrenceFor(e);return r?`Every ${r.interval} ${r.unit}${r.interval===1?'':'s'}`:'Once';};
export const carePriority=(e:Event)=>e.priority||(/medic|worm|flea|tick|vaccin|vet|appoint|treatment/i.test(e.title)?'important':'helpful');
export function timelineGroup(e:Event,now=Date.now()){
 const today=new Date(now);today.setHours(0,0,0,0);const tomorrow=new Date(today);tomorrow.setDate(today.getDate()+1);const after=new Date(tomorrow);after.setDate(tomorrow.getDate()+1);const at=Date.parse(e.startAt);
 if(e.status==='completed')return 'Completed';if(at<today.getTime())return 'Overdue';if(at<tomorrow.getTime())return 'Today';if(at<after.getTime())return 'Tomorrow';return new Date(at).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'short'});
}
