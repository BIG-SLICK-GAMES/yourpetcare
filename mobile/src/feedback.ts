import { AppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { prepareSound, playSuccess } from './feedback-sound';

const key='yourpetcare.feedback';
let settings={haptics:true,sound:true};
const listeners=new Set<()=>void>();
export const feedbackSnapshot=()=>settings;
export const subscribeFeedback=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export async function loadFeedback(){try{const value=Platform.OS==='web'?localStorage.getItem(key):await SecureStore.getItemAsync(key);if(value){const parsed=JSON.parse(value);if(typeof parsed.haptics==='boolean'&&typeof parsed.sound==='boolean'){settings=parsed;listeners.forEach(fn=>fn());}}}catch{}}
export async function setFeedback(next:typeof settings){settings=next;listeners.forEach(fn=>fn());try{if(Platform.OS==='web')localStorage.setItem(key,JSON.stringify(next));else await SecureStore.setItemAsync(key,JSON.stringify(next));}catch{}}
export function tapFeedback(){
  if(settings.sound)prepareSound();
  if(settings.haptics)void (Platform.OS==='android'?Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick):Haptics.selectionAsync()).catch(()=>{});
}
export function successFeedback(){
  if(AppState.currentState!=='active')return;
  if(settings.haptics)void (Platform.OS==='android'?Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm):Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)).catch(()=>{});
  if(settings.sound)try{playSuccess();}catch{}
}
