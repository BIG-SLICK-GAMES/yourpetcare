import React,{useEffect,useState} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {useApp} from './state';
import type {Event} from './types';
import {Button,Card,ErrorText,Heading,Label,s} from './ui';
import {repeatLabel,timelineGroup} from './care-utils';
export function CareTimeline({events,compact=false}:{events:Event[];compact?:boolean}){
 const app=useApp(),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
 async function act(e:Event,later=false){setBusy(e.id);setError('');try{const p=await app.propose({action:later?'snooze_event':'complete_event',petId:e.petId,data:later?{eventId:e.id,remindAt:new Date(now+3600000).toISOString()}:{eventId:e.id}});router.push({pathname:'/review',params:{id:p.id}});}catch(err){setError((err as Error).message);}finally{setBusy('');}}
 return <View style={{gap:14}}><ErrorText message={error}/>{events.map((e,index)=>{const group=timelineGroup(e,now),heading=index===0||group!==timelineGroup(events[index-1],now);return <View key={e.id} style={{gap:12}}>{heading&&<Heading>{group}</Heading>}<Card><Label small muted>{app.account?.pets.find(p=>p.id===e.petId)?.name} · {new Date(e.startAt).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})}</Label><Heading>{e.title}</Heading>{!compact&&!!e.location&&<Label>{e.location}</Label>}{!compact&&<Label small muted>{repeatLabel(e)}{e.reminderMinutes?` · reminder ${e.reminderMinutes} min before`:''}</Label>}{e.snoozedUntil&&Date.parse(e.snoozedUntil)>now&&<Label small>Reminder moved to {new Date(e.snoozedUntil).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})}</Label>}{e.status==='planned'?<><View style={s.wrap}><Button title="Done" icon="check" busy={busy===e.id} disabled={!!busy} onPress={()=>void act(e)}/><Button secondary title="Remind later" disabled={!!busy} onPress={()=>void act(e,true)}/></View>{!compact&&<Button secondary title="Edit care item" onPress={()=>router.push({pathname:'/care-event',params:{id:e.id}})}/>}</>:<Label small>Completed {new Date(e.completedAt||e.startAt).toLocaleDateString('en-AU')}{e.completedBy===app.account?.id?' by you':''}</Label>}</Card></View>;})}</View>;
}
