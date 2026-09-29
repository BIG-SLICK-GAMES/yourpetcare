import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
type Preference={identifier:string;name:string;language:string};
const key='yourpetcare.pip-voice';
let preference:Preference|null=null,loaded=false;
const listeners=new Set<()=>void>();
export const voicePreference=()=>preference;
export const subscribeVoicePreference=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export async function loadVoicePreference(){
  if(loaded)return;
  try{const raw=Platform.OS==='web'?localStorage.getItem(key):await SecureStore.getItemAsync(key);if(raw){const parsed=JSON.parse(raw);if(typeof parsed.identifier==='string'&&typeof parsed.name==='string'&&typeof parsed.language==='string')preference=parsed;}}catch{}
  loaded=true;listeners.forEach(fn=>fn());
}
export async function saveVoicePreference(value:Preference|null){
  if(Platform.OS==='web'){if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);}
  else if(value)await SecureStore.setItemAsync(key,JSON.stringify(value));else await SecureStore.deleteItemAsync(key);
  loaded=true;preference=value;listeners.forEach(fn=>fn());
}
