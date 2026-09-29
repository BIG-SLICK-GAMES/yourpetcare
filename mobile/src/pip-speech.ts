import * as Speech from 'expo-speech';

let settle:(()=>void)|undefined;
export async function stopPipSpeech(){const done=settle;settle=undefined;done?.();await Speech.stop();}
export async function speakPip(text:string){
  await stopPipSpeech();
  await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{finish(new Error('Spoken reply timed out.'));void Speech.stop();},120000);
    function finish(error?:Error){clearTimeout(timer);if(settle===done)settle=undefined;if(error)reject(error);else resolve();}
    const done=()=>finish();settle=done;
    try{Speech.speak(text,{language:'en-AU',rate:.95,onDone:done,onStopped:done,onError:()=>finish(new Error('Audio playback is unavailable. You can read the reply.'))});}catch(error){finish(error as Error);}
  });
}
