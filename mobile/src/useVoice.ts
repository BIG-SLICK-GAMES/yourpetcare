import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as DeviceState } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as Speech from 'expo-speech';
import { api } from './api';
import { voiceTurn } from './voice-turn';
import { readVoice, discardVoice } from './voice-file';

export function useVoice(onTranscript:(text:string)=>Promise<void>, onError:(message:string)=>void) {
  const recorder=useAudioRecorder({...RecordingPresets.HIGH_QUALITY,isMeteringEnabled:true});
  const [conversing,setConversing]=useState(false);
  const session=useRef(false),startAgain=useRef<()=>Promise<void>>(async()=>{}),meter=useRef<ReturnType<typeof setInterval>|null>(null);
  const [recording,setRecording]=useState(false),[working,setWorking]=useState(false);
  const epoch=useRef(0),locked=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const callbacks=useRef({onTranscript,onError});
  useEffect(()=>{callbacks.current={onTranscript,onError};},[onTranscript,onError]);
  const cancel=useCallback(async()=>{
    session.current=false;setConversing(false);void Speech.stop();epoch.current++;if(timer.current)clearTimeout(timer.current);if(meter.current)clearInterval(meter.current);
    try {if(recorder.isRecording)await recorder.stop();if(recorder.uri)discardVoice(recorder.uri);}catch{}
    await setAudioModeAsync({allowsRecording:false}).catch(()=>{});
    locked.current=false;setRecording(false);setWorking(false);
  },[recorder]);
  useEffect(()=>{const sub=DeviceState.addEventListener('change',state=>{if(state!=='active')void cancel();});return()=>{sub.remove();void cancel();};},[cancel]);
  const finish=useCallback(async()=>{
    if(locked.current)return;locked.current=true;const turn=epoch.current;
    if(timer.current)clearTimeout(timer.current);if(meter.current)clearInterval(meter.current);
    setRecording(false);setWorking(true);
    let uri:string|null=null;
    try {
      await recorder.stop();uri=recorder.uri;
      await setAudioModeAsync({allowsRecording:false});
      if(!uri)throw new Error('No recording found. Try again.');
      const audio=await readVoice(uri);
      if(turn!==epoch.current)return;
      const result=await api<{text:string}>('voice/transcribe',{...audio,consent:true});
      if(turn===epoch.current){if(/^(?:hey pip[,! ]*)?(?:stop|end (?:the )?(?:chat|conversation)|goodbye pip)[.! ]*$/i.test(result.text.trim())){session.current=false;setConversing(false);}else await callbacks.current.onTranscript(result.text);}
    } catch(error) {if(turn===epoch.current){session.current=false;setConversing(false);callbacks.current.onError((error as Error).message);}}
    finally {if(uri)discardVoice(uri);if(turn===epoch.current){locked.current=false;setWorking(false);if(session.current)timer.current=setTimeout(()=>void startAgain.current(),450);}}
  },[recorder]);
  const start=useCallback(async()=>{
    if(locked.current||recorder.isRecording)return;session.current=true;setConversing(true);locked.current=true;const turn=++epoch.current;
    setWorking(true);
    try {
      const permission=await AudioModule.requestRecordingPermissionsAsync();
      if(!permission.granted)throw new Error('Microphone access is off. You can type instead.');
      if(turn!==epoch.current)return;
      await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});
      await recorder.prepareToRecordAsync();
      if(turn!==epoch.current){await recorder.stop().catch(()=>{});return;}
      recorder.record();setRecording(true);
      const began=Date.now(),turnState={heard:false,lastSound:began,voicedFrames:0};
      meter.current=setInterval(()=>{
        if(turn!==epoch.current||!recorder.isRecording)return;
        const decision=voiceTurn(turnState,recorder.getStatus().metering,Date.now(),began);
        if(decision==='send')void finish();
        if(decision==='idle'){void cancel();callbacks.current.onError('Conversation paused. Start again whenever you are ready.');}
      },150);
      timer.current=setTimeout(()=>void finish(),30000);
    }catch(error){if(turn===epoch.current){session.current=false;setConversing(false);callbacks.current.onError((error as Error).message);}}
    finally{if(turn===epoch.current){locked.current=false;setWorking(false);}}
  },[recorder,finish,cancel]);
  useEffect(()=>{startAgain.current=start;},[start]);
  return {recording,working,conversing,start,finish,cancel,isActive:()=>session.current};
}
