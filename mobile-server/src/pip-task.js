import {Problem} from './domain.js';

export const taskStateSchema={type:['object','null'],properties:{
  task:{type:'string'},knownDetails:{type:'string'},missingDetails:{type:'string'},proposedAction:{type:'string'},
},required:['task','knownDetails','missingDetails','proposedAction'],additionalProperties:false};

export function taskState(value){
  if(value==null)return null;
  const keys=['task','knownDetails','missingDetails','proposedAction'];
  if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>typeof value[k]!=='string'||value[k].length>600))throw new Problem('Pip could not keep track of that task. Please try again.',503);
  return Object.fromEntries(keys.map(k=>[k,value[k].trim()]));
}
export function activeTask(account,key,now=Date.now()){
  const task=account.pipTasks?.[key];
  if(!task||now-Date.parse(task.updatedAt)>7*86400000)return null;
  const proposal=account.proposals.find(p=>p.id===task.proposalId);
  return {...task,confirmationStatus:proposal?(proposal.status==='pending'&&Date.parse(proposal.expiresAt)<now?'expired':proposal.status):'not proposed'};
}
export function rememberTask(account,key,value,petId,proposal,now=Date.now()){
  const validated=taskState(value);
  account.pipTasks=Object.fromEntries(Object.entries(account.pipTasks||{}).filter(([,v])=>now-Date.parse(v.updatedAt)<=7*86400000).slice(-39));
  if(!validated){delete account.pipTasks[key];return;}
  const previous=account.pipTasks[key];
  account.pipTasks[key]={...validated,petId:petId||null,updatedAt:new Date(now).toISOString(),proposalId:proposal?.id||(previous?.task===validated.task?previous.proposalId:null)};
}

export const forwardThinkingInstructions=`
THOUGHTFUL FOLLOW-THROUGH
Answer the immediate request using the selected pet, saved profile/settings, actual schedule, shopping list, recent confirmations and activeTask before asking questions. Resolve 'his', 'that one' and 'yep' against this context. Do not restart a task after a short reply. activeTask is a conversation note, not verified profile data or permission to change anything; saved facts and actual confirmationStatus take precedence. Keep taskState updated with the current task, relevant known and missing details, and proposed next action; use null when finished, cancelled or no task exists. Never put secrets in taskState. It is short-term context, not an inventory ledger or a permanent care record.
Think one logical step ahead privately: consider the immediate consequence and the next likely need. Surface at most ONE useful, supported insight and ONE relevant next action, then stop. Prioritise urgent safety, overdue care, upcoming appointments, treatment supply, food running low, routine care, then convenience. Do not recite unrelated records or finish with generic offers of help. Usually use 1–3 sentences, except an explicitly requested plan, summary or useful shopping comparison.
Examples of relevant connections: completed recurring care -> its recorded next occurrence; last recorded dose used -> a replacement pack; a known food purchase and known daily usage -> estimated run-out; a trip -> pet care coverage; an appointment -> its reminder/preparation. Use only explicit quantities, units and owner/vet-provided intervals. Monthly is not automatically 30 days. Never invent a treatment frequency, food amount, stock balance, feeding rate, or care coverage. Label estimates and their assumptions, distinguish reported facts from calculations, and ask only the missing essential detail. Do not expose private reasoning steps.
If food is running low and the usual product/pack is saved, reuse it rather than asking which food. If product quantity or consumption is unknown, say so only when necessary for a requested estimate. Record useful supply facts through set_pet_settings or remember_care with review; never claim an automatic inventory update, purchase, appointment booking or reminder delivery. A user's report that a dose was given is not proof this app marked its calendar event complete. Offer complete_event for the matching saved event, then rely on confirmation before saying it is saved. Its real recurrence supplies the next date. Proposed changes remain drafts until confirmed. After confirmation, acknowledge exactly what changed, with one supported consequence if useful.
`;
