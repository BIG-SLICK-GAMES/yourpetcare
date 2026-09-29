import {useEffect,useRef} from 'react';
import * as Notifications from 'expo-notifications';
import {router} from 'expo-router';
import {useApp} from './state';
export function CareNotificationHandler(){
 const app=useApp(),latest=useRef(app),handled=useRef('');
 useEffect(()=>{latest.current=app;},[app]);
 useEffect(()=>{
  async function respond(response:Notifications.NotificationResponse){
   const current=latest.current,data=response.notification.request.content.data,id=response.notification.request.identifier+response.actionIdentifier;
   if(handled.current===id||!current.account||!data||data.accountId!==current.account.id)return;
   handled.current=id;
   const event=current.account.events.find(e=>e.id===data.eventId&&e.status==='planned');
   if(!event){router.push('/calendar');return;}
   current.select(event.petId);
   if(!['care-done','care-later'].includes(response.actionIdentifier)){router.push('/calendar');return;}
   try{const later=response.actionIdentifier==='care-later',p=await current.propose({action:later?'snooze_event':'complete_event',petId:event.petId,data:later?{eventId:event.id,remindAt:new Date(Date.now()+3600000).toISOString()}:{eventId:event.id}});router.push({pathname:'/review',params:{id:p.id}});}catch{current.setNotice('Open the care item to review its latest details.');router.push('/calendar');}
  }
  const last=Notifications.getLastNotificationResponse();if(last)void respond(last);
  const subscription=Notifications.addNotificationResponseReceivedListener(r=>void respond(r));return()=>subscription.remove();
 },[app.account?.id,app.loading]);
 return null;
}
