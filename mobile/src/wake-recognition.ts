export type Recognition={lang:string;continuous:boolean;interimResults:boolean;onstart:(()=>void)|null;onend:(()=>void)|null;onerror:((event:{error:string})=>void)|null;onresult:((event:{resultIndex:number;results:ArrayLike<{isFinal:boolean;[index:number]:{transcript:string}}>})=>void)|null;start:()=>void;abort:()=>void};
export function wakeRecognition(): (new()=>Recognition)|undefined {
  if(typeof window==='undefined')return;
  const browser=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  return browser.SpeechRecognition||browser.webkitSpeechRecognition;
}
