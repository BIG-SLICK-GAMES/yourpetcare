import React,{useEffect,useState,useSyncExternalStore} from 'react';
import { AppState,View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from './state';
import { Pressable } from './FeedbackPressable';
import { C,Label } from './ui';
import { audioBusy,subscribeAudio } from './audio-activity';
import { setWakeEnabled,subscribeWake,wakeEnabled,wakeRequest } from './wake-state';
import { wakeRecognition } from './wake-recognition';

export function WakeListener(){
  const app=useApp(),owner=app.account?.id;
  const enabled=useSyncExternalStore(subscribeWake,wakeEnabled,()=>false),busy=useSyncExternalStore(subscribeAudio,audioBusy,()=>false);
  const [status,setStatus]=useState('Starting Hey Pip...');
  useEffect(()=>{
    if(!owner)setWakeEnabled(false);
    const sub=AppState.addEventListener('change',state=>{if(state!=='active')setWakeEnabled(false);});
    const hidden=()=>{if(document.hidden)setWakeEnabled(false);};
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',hidden);
    return()=>{sub.remove();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',hidden);};
  },[owner]);
  useEffect(()=>{
    if(!enabled||busy||!owner)return;
    const Constructor=wakeRecognition();if(!Constructor)return;
    const recognition=new Constructor();let cancelled=false,triggered=false,restarts=0,timer:ReturnType<typeof setTimeout>|undefined;
    recognition.lang='en-AU';recognition.continuous=true;recognition.interimResults=false;
    recognition.onstart=()=>{if(!cancelled)setStatus('Listening for Hey Pip');};
    recognition.onresult=event=>{
      if(cancelled||triggered||audioBusy()||!wakeEnabled())return;
      for(let i=event.resultIndex;i<event.results.length;i++){
        const result=event.results[i];if(!result.isFinal)continue;
        const text=wakeRequest(result[0].transcript);if(text===null)continue;
        triggered=true;recognition.abort();setStatus('Opening Pip...');
        router.push({pathname:'/pet-chat',params:{voice:'wake',wakeText:text.slice(0,1500)}});break;
      }
    };
    recognition.onerror=event=>{
      if(cancelled||triggered||event.error==='aborted')return;
      if(event.error==='no-speech')return;
      cancelled=true;setStatus('Hey Pip stopped. Check microphone access and try again in Settings.');setWakeEnabled(false);recognition.abort();
    };
    function start(){try{recognition.start();}catch{setStatus('Hey Pip could not start. Try again in Settings.');setWakeEnabled(false);}}
    recognition.onend=()=>{if(cancelled||triggered)return;if(++restarts>20){setStatus('Hey Pip paused. Enable it again when you need it.');setWakeEnabled(false);return;}timer=setTimeout(start,500);};
    start();
    return()=>{cancelled=true;if(timer)clearTimeout(timer);recognition.onend=null;recognition.onresult=null;recognition.onerror=null;recognition.abort();};
  },[enabled,busy,owner]);
  if(!enabled)return status.startsWith('Hey Pip stopped')||status.startsWith('Hey Pip could not')?<View style={{padding:8,backgroundColor:C.sage}}><Label small>{status}</Label></View>:null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Turn Hey Pip off" onPress={()=>setWakeEnabled(false)} style={{minHeight:44,paddingHorizontal:16,justifyContent:'center',backgroundColor:C.sage}}><Label small style={{textAlign:'center'}}>{busy?'Hey Pip paused during conversation':status} · Turn off</Label></Pressable>;
}
