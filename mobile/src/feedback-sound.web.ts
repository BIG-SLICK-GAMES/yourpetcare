let context:AudioContext|undefined;
export function prepareSound(){
  try{const Audio=globalThis.AudioContext;if(!Audio)return;context??=new Audio();if(context.state==='suspended')void context.resume().catch(()=>{});}catch{}
}
export function playSuccess(){
  if(!context||context.state!=='running')return;
  const start=context.currentTime;
  for(const [offset,frequency,duration,volume] of [[0,1800,.035,.07],[.05,880,.24,.1],[.14,1320,.38,.08]]){
    const oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(.001,start+offset);gain.gain.linearRampToValueAtTime(volume,start+offset+.008);gain.gain.exponentialRampToValueAtTime(.001,start+offset+duration);
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start+offset);oscillator.stop(start+offset+duration);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
}
