import type { Event } from './types';
import {recurrenceFor,occurrenceAt} from './care-utils';

// A bounded rolling window continues routines even when the owner forgets to mark one done.
export function reminderSchedule(events:Event[],now=Date.now(),limit=50){
  const occurrences:{event:Event;at:number}[]=[];
  for(const event of events){
    if(event.status!=='planned')continue;
    const first=Date.parse(event.startAt),rule=recurrenceFor(event),lead=(event.reminderMinutes||0)*60000;
    if(!Number.isFinite(first))continue;
    const snoozed=event.snoozedUntil?Date.parse(event.snoozedUntil):0;
    if(!rule){const at=snoozed>now?snoozed:first-lead;if(at>now)occurrences.push({event,at});continue;}
    const anchor=Date.parse(event.recurrenceAnchor||event.startAt);
    let next=Math.max(0,Math.floor((now-anchor)/(rule.interval*(rule.unit==='year'?366:rule.unit==='month'?31:rule.unit==='week'?7:1)*86400000))-1),added=0;
    if(snoozed>now){occurrences.push({event,at:snoozed});added++;}
    for(let tries=0;tries<10000&&added<limit;tries++,next++){
      const due=occurrenceAt(event,next),at=due-lead;
      if(due<first||at<=now||(snoozed>now&&at<=snoozed))continue;
      occurrences.push({event,at});added++;
    }
  }
  return occurrences.sort((a,b)=>a.at-b.at).slice(0,limit);
}
