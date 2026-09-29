let enabled=false;
const listeners=new Set<()=>void>();
export const wakeEnabled=()=>enabled;
export const subscribeWake=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export function setWakeEnabled(value:boolean){enabled=value;listeners.forEach(fn=>fn());}
export function wakeRequest(text:string):string|null {
  const match=text.trim().match(/^hey[\s,]+pip\b[\s,.!?]*(.*)$/i);
  return match?match[1].trim():null;
}
