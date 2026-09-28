// Fictional, owner-entered example context. This module cannot access accounts or APIs.
export type PreviewContext = Readonly<{
  name:string; species:string; treatmentDays:number; doses:number;
  vaccinationDays:number; foodGrams:number; dailyGrams:number;
}>;
export const exampleContext:PreviewContext=Object.freeze({name:'Stormy',species:'Dog',treatmentDays:7,doses:1,vaccinationDays:16,foodGrams:800,dailyGrams:200});
export type NoticeKind='treatment'|'vaccination'|'food';
export type PreviewNotice={id:NoticeKind;title:string;message:string;evidence:string;reminder?:string;shopping?:string};
export interface PreviewProvider { notices(context:PreviewContext):PreviewNotice[] }
export const previewRules:PreviewProvider={notices:c=>[
  {id:'treatment',title:'A little care, already remembered',message:`${c.name}'s worming treatment is due in ${c.treatmentDays} days. There ${c.doses===1?'is':'are'} ${c.doses} dose${c.doses===1?'':'s'} remaining.`,evidence:'Example owner-recorded due date and stock count, not a treatment recommendation.',reminder:'Worming treatment',shopping:'Worming supplies'},
  {id:'vaccination',title:'Time to plan ahead',message:`${c.name}'s recorded vaccination date is in ${c.vaccinationDays} days. Shall we make it easier to remember?`,evidence:'Example date supplied by the owner. Confirm vaccination timing with a vet.',reminder:'Vaccination appointment'},
  {id:'food',title:'One less thing to run out of',message:c.dailyGrams>0?`${c.name}'s food may last about ${Math.floor(c.foodGrams/c.dailyGrams)} days.`:'Enter daily usage before estimating remaining food.',evidence:`Example: ${c.foodGrams} g remaining / ${c.dailyGrams} g used each day. An estimate, not feeding advice.`,shopping:'Usual pet food'}
]};
export type PreviewState={reminders:{id:NoticeKind;title:string}[];shopping:{id:NoticeKind;title:string}[];history:{id:NoticeKind;title:string}[];dismissed:NoticeKind[];receipt:string};
export const emptyPreview=():PreviewState=>({reminders:[],shopping:[],history:[],dismissed:[],receipt:''});
export type PreviewAction={type:'reminder'|'shopping';notice:PreviewNotice}|{type:'complete';id:NoticeKind}|{type:'dismiss';id:NoticeKind}|{type:'reset'};
// Stable notice IDs make repeated taps idempotent. Real action execution stays server-side.
export function previewAction(state:PreviewState,action:PreviewAction):PreviewState{
  if(action.type==='reset')return emptyPreview();
  if(action.type==='dismiss')return {...state,dismissed:[...new Set([...state.dismissed,action.id])],receipt:'Not now. Nothing has been added.'};
  if(action.type==='complete'){
    const entry=state.reminders.find(r=>r.id===action.id);
    if(!entry)return state;
    return {...state,reminders:state.reminders.filter(r=>r.id!==action.id),history:state.history.some(r=>r.id===entry.id)?state.history:[...state.history,entry],receipt:'Added to demo history only. No real care record changed.'};
  }
  const list=action.type==='reminder'?'reminders':'shopping',title=action.notice[action.type];
  if(!title||state[list].some(r=>r.id===action.notice.id)||(list==='reminders'&&state.history.some(r=>r.id===action.notice.id)))return state;
  return {...state,[list]:[...state[list],{id:action.notice.id,title}],receipt:list==='reminders'?'Added to the demo care schedule only. No notification will be sent.':'Added to the demo shopping list only. Nothing was ordered.'};
}
