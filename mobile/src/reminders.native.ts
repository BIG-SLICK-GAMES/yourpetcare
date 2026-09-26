import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Account } from './types';
import { reminderSchedule } from './reminder-schedule';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});
let queue: Promise<void> = Promise.resolve();
function serialize(work:()=>Promise<void>) { const next=queue.catch(()=>{}).then(work);queue=next;return next; }
export function clearReminders() { return serialize(async()=>{await SecureStore.deleteItemAsync('yourpetcare.reminders');await Notifications.cancelAllScheduledNotificationsAsync();}); }
export async function enableReminders(account:Account) {
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync('pet-care',{name:'Pet care reminders',importance:Notifications.AndroidImportance.DEFAULT});
  const permission=await Notifications.requestPermissionsAsync();
  if(!permission.granted)throw new Error('Reminders are off. You can enable them in your device settings.');
  await SecureStore.setItemAsync('yourpetcare.reminders',account.id);
  await syncReminders(account);
}
export function syncReminders(account:Account) { return serialize(async()=>{
  if(await SecureStore.getItemAsync('yourpetcare.reminders')!==account.id)return;
  const permission=await Notifications.getPermissionsAsync();if(!permission.granted)return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for(const {event,at} of reminderSchedule(account.events))await Notifications.scheduleNotificationAsync({identifier:`ypc-${account.id}-${event.id}-${at}`,content:{title:event.title,body:`Time with ${account.pets.find(p=>p.id===event.petId)?.name||'your pet'}.`,data:{eventId:event.id}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at),channelId:'pet-care'}});
}); }
