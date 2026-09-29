import React,{useState} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {useApp} from './state';
import {Button,Card,Chip,ErrorText,Heading,Label,s} from './ui';
export function NotificationPreferences(){
 const app=useApp(),[values,setValues]=useState(app.account?.notificationPreferences||{important:true,helpful:true,optional:false}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <Card><Heading>Care notifications</Heading><Label small>Choose the categories that help you. Device permissions still apply.</Label><View style={s.wrap}>{(['important','helpful','optional'] as const).map(k=><Chip key={k} title={`${k}: ${values[k]?'on':'off'}`} active={values[k]} onPress={()=>setValues({...values,[k]:!values[k]})}/>)}</View><Label small>Important: appointments and treatment. Helpful: routines and supplies. Optional: discovery and offers.</Label><ErrorText message={error}/><Button secondary title="Review notification choices" busy={busy} onPress={()=>{setBusy(true);void app.propose({action:'set_notification_preferences',data:values}).then(p=>router.push({pathname:'/review',params:{id:p.id}})).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}/></Card>;
}
