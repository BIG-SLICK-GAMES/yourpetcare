import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as DeviceState } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { api } from './api';
import { readVoice, discardVoice } from './voice-file';

export function useVoice(onTranscript:(text:string)=>Promise<void>, onError:(message:string)=>void) {
  const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording,setRecording]=useState(false),[working,setWorking]=useState(false);
  const epoch=useRef(0),locked=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const callbacks=useRef({onTranscript,onError});
  useEffect(()=>{callbacks.current={onTranscript,onError};},[onTranscript,onError]);
  const cancel=useCallback(async()=>{
    epoch.current++;if(timer.current)clearTimeout(timer.current);
    try {if(recorder.isRecording)await recorder.stop();if(recorder.uri)discardVoice(recorder.uri);}catch{}
    await setAudioModeAsync({allowsRecording:false}).catch(()=>{});
    locked.current=false;setRecording(false);setWorking(false);
  },[recorder]);
  useEffect(()=>{const sub=DeviceState.addEventListener('change',state=>{if(state!=='active')void cancel();});return()=>{sub.remove();void cancel();};},[cancel]);
  const finish=useCallback(async()=>{
    if(locked.current)return;locked.current=true;const turn=epoch.current;
    if(timer.current)clearTimeout(timer.current);
    setRecording(false);setWorking(true);
    let uri:string|null=null;
    try {
      await recorder.stop();uri=recorder.uri;
      await setAudioModeAsync({allowsRecording:false});
      if(!uri)throw new Error('No recording found. Try again.');
      const audio=await readVoice(uri);
      if(turn!==epoch.current)return;
      const result=await api<{text:string}>('voice/transcribe',{...audio,consent:true});
      if(turn===epoch.current)await callbacks.current.onTranscript(result.text);
    } catch(error) {if(turn===epoch.current)callbacks.current.onError((error as Error).message);}
    finally {if(uri)discardVoice(uri);if(turn===epoch.current){locked.current=false;setWorking(false);}}
  },[recorder]);
  const start=useCallback(async()=>{
    if(locked.current||recorder.isRecording)return;locked.current=true;const turn=++epoch.current;
    setWorking(true);
    try {
      const permission=await AudioModule.requestRecordingPermissionsAsync();
      if(!permission.granted)throw new Error('Microphone access is off. You can type instead.');
      if(turn!==epoch.current)return;
      await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});
      await recorder.prepareToRecordAsync();
      if(turn!==epoch.current){await recorder.stop().catch(()=>{});return;}
      recorder.record();setRecording(true);timer.current=setTimeout(()=>void finish(),30000);
    }catch(error){if(turn===epoch.current)callbacks.current.onError((error as Error).message);}
    finally{if(turn===epoch.current){locked.current=false;setWorking(false);}}
  },[recorder,finish]);
  return {recording,working,start,finish,cancel};
}
