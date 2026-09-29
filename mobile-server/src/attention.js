export function attentionItems(account, now=Date.now()) {
  const pending=account.proposals.filter(p=>p.status==='pending'&&Date.parse(p.expiresAt)>now);
  const choices=pending.map(p=>({id:`choice:${p.id}`,kind:'choice',petId:p.petId||null,title:p.summary,targetId:p.id,at:p.expiresAt}));
  const events=account.events.filter(e=>e.status==='planned'&&Date.parse(e.startAt)<=now&&account.pets.some(p=>p.id===e.petId)&&!pending.some(p=>p.action==='complete_event'&&p.data.eventId===e.id)).map(e=>{
    const first=Date.parse(e.startAt),interval=e.repeatDays*86400000;
    const at=new Date(interval?first+Math.floor((now-first)/interval)*interval:first).toISOString();
    return {id:`event:${e.id}:${at}`,kind:'event',petId:e.petId,title:e.title,targetId:e.id,at};
  });
  return [...choices,...events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))];
}
