import {claimAudio} from './audio-activity';
import * as Speech from 'expo-speech';
import {loadVoicePreference,voicePreference} from './voice-preferences';

const audioOwner=Symbol('speech');
let settle:(()=>void)|undefined;
export async function stopPipSpeech(){const done=settle;settle=undefined;done?.();await Speech.stop();}
export async function speakPip(text:string){
  await stopPipSpeech();
  await loadVoicePreference();
  const selected=voicePreference();
  claimAudio(audioOwner,true);
  await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>{finish(new Error('Spoken reply timed out.'));void Speech.stop();},120000);
    function finish(error?:Error){clearTimeout(timer);claimAudio(audioOwner,false);if(settle===done)settle=undefined;if(error)reject(error);else resolve();}
    const done=()=>finish();settle=done;
    try{Speech.speak(text,{language:selected?.language||'en-AU',...(selected?{voice:selected.identifier}:{}),rate:.95,onDone:done,onStopped:done,onError:()=>finish(new Error('Audio playback is unavailable. You can read the reply.'))});}catch(error){finish(error as Error);}
  });
}
