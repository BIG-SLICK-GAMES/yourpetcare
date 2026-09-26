import type { Event } from './types';

// A bounded rolling window continues routines even when the owner forgets to mark one done.
export function reminderSchedule(events:Event[],now=Date.now(),limit=50){
  const occurrences:{event:Event;at:number}[]=[];
  for(const event of events){
    if(event.status!=='planned')continue;
    const first=Date.parse(event.startAt),interval=event.repeatDays*86400000;
    if(!Number.isFinite(first))continue;
    if(!interval){if(first>now)occurrences.push({event,at:first});continue;}
    const next=Math.max(0,Math.floor((now-first)/interval)+1);
    for(let i=next;i<next+limit;i++)occurrences.push({event,at:first+i*interval});
  }
  return occurrences.sort((a,b)=>a.at-b.at).slice(0,limit);
}
