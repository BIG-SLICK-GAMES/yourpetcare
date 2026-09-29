export type VoiceTurnState={heard:boolean;lastSound:number;voicedFrames:number};
// Require sustained sound, tolerate a thinking pause, and never send empty silence.
export function voiceTurn(state:VoiceTurnState,level:number|undefined,now:number,began:number):'listen'|'send'|'idle' {
  if(typeof level==='number'&&level>-42){state.voicedFrames++;state.lastSound=now;if(state.voicedFrames>=3)state.heard=true;}
  if(state.heard&&now-state.lastSound>=1800&&now-began>=1200)return 'send';
  if(!state.heard&&now-began>=12000)return 'idle';
  return 'listen';
}
