const owners=new Set<symbol>(),listeners=new Set<()=>void>();
export const audioBusy=()=>owners.size>0;
export const subscribeAudio=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export function claimAudio(owner:symbol,busy:boolean){if(busy)owners.add(owner);else owners.delete(owner);listeners.forEach(fn=>fn());}
