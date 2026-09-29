import React,{useEffect,useState,useSyncExternalStore} from 'react';
import { ScrollView,View,Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Pressable } from './FeedbackPressable';
import { Button,Card,C,ErrorText,Field,Heading,Label } from './ui';
import { loadVoicePreference,saveVoicePreference,subscribeVoicePreference,voicePreference } from './voice-preferences';
import { speakPip,stopPipSpeech } from './pip-speech';

export function VoiceSettings(){
  const selected=useSyncExternalStore(subscribeVoicePreference,voicePreference,()=>null);
  const [voices,setVoices]=useState<Speech.Voice[]>([]),[open,setOpen]=useState(false),[query,setQuery]=useState(''),[error,setError]=useState(''),[preview,setPreview]=useState(false);
  useEffect(()=>{
    let active=true;void loadVoicePreference();
    const refresh=()=>{void Speech.getAvailableVoicesAsync().then(v=>{if(active)setVoices(v);}).catch(()=>{if(active)setError('Voice choices are unavailable on this device right now.');});};refresh();
    if(Platform.OS==='web')window.speechSynthesis?.addEventListener('voiceschanged',refresh);
    return()=>{active=false;if(Platform.OS==='web')window.speechSynthesis?.removeEventListener('voiceschanged',refresh);void stopPipSpeech();};
  },[]);
  const options=voices.filter(v=>`${v.name} ${v.language}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>Number(b.language==='en-AU')-Number(a.language==='en-AU')||a.name.localeCompare(b.name));
  async function choose(voice:Speech.Voice|null){try{await saveVoicePreference(voice?{identifier:voice.identifier,name:voice.name,language:voice.language}:null);setError('');setOpen(false);}catch{setError('Could not save your voice choice. Please try again.');}}
  return <Card><Heading>Pip&apos;s voice</Heading><Label>{selected?`${selected.name} (${selected.language})`:'Device default'}</Label>
    <Button secondary title={open?'Close voice choices':'Choose a voice'} icon="sound" onPress={()=>setOpen(!open)}/>
    {open&&<><Field label="Find a voice or language" value={query} onChange={setQuery}/><ScrollView nestedScrollEnabled style={{maxHeight:240}} contentContainerStyle={{gap:6}}>
      <Button secondary title="Use device default" onPress={()=>void choose(null)}/>
      {options.map(v=><Pressable key={v.identifier} accessibilityRole="radio" accessibilityState={{checked:selected?.identifier===v.identifier}} accessibilityLabel={`${v.name}, ${v.language}`} onPress={()=>void choose(v)} style={{minHeight:48,padding:12,borderRadius:12,backgroundColor:selected?.identifier===v.identifier?C.sage:C.paper}}><Label small>{v.name} ({v.language})</Label></Pressable>)}
      {!options.length&&<Label small>No matching voices loaded. You can still use the device default.</Label>}
    </ScrollView></>}
    <View><Button secondary title={preview?'Stop preview':'Hear this voice'} onPress={()=>{if(preview){void stopPipSpeech();setPreview(false);return;}setPreview(true);setError('');void speakPip("Hi, I'm Pip. Let's make caring for your pet a little easier.").catch(e=>setError(e.message)).finally(()=>setPreview(false));}}/></View>
    <Label small muted>Saved on this device. Available voices depend on your phone or browser.</Label><ErrorText message={error}/>
  </Card>;
}
