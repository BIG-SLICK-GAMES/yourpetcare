import React,{useState} from 'react';
import {View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {useApp} from '../state';
import {Button,Card,Chip,ErrorText,Field,Heading,Label,Screen,Title,s} from '../ui';
import DateField from '../DateField';
import type {Recurrence} from '../types';
import {recurrenceFor} from '../care-utils';
export default function CareEvent(){
 const app=useApp(),params=useLocalSearchParams<{id?:string}>();if(app.loading)return <Screen><Label>Loading care details…</Label></Screen>;
 const e=app.account?.events.find(e=>e.id===params.id);if(params.id&&!e)return <Screen><Title>Care item unavailable</Title><Button title="Back to calendar" onPress={()=>router.replace('/calendar')}/></Screen>;
 return <Editor key={e?.id||app.selected?.id||'new'} id={e?.id}/>;
}
function Editor({id}:{id?:string}){
 const app=useApp(),event=app.account?.events.find(e=>e.id===id),pet=event?app.account?.pets.find(p=>p.id===event.petId):app.selected;
 const r=event?recurrenceFor(event):null;
 const [title,setTitle]=useState(event?.title||''),[when,setWhen]=useState(()=>new Date(event?.startAt||Date.now()+3600000)),[place,setPlace]=useState(event?.location||'');
 const [unit,setUnit]=useState<Recurrence['unit']|'once'>(r?.unit||'once'),[interval,setInterval]=useState(String(r?.interval||1)),[lead,setLead]=useState(String(event?.reminderMinutes||0));
 const [stock,setStock]=useState(event?.inventoryId||''),[used,setUsed]=useState(String(event?.quantityUsed||'')),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function review(cancel=false){if(!app.account){router.push('/account');return;}if(!pet){setError('Add or select a pet first.');return;}setBusy(true);setError('');try{
  const changes={title,startAt:when.toISOString(),location:place,recurrence:unit==='once'?null:{unit,interval:Number(interval)},reminderMinutes:Number(lead),inventoryId:stock||null,quantityUsed:stock?Number(used):null};
  const p=await app.propose({action:cancel?'cancel_event':event?'update_event':'plan',petId:pet.id,data:cancel?{eventId:event!.id}:event?{eventId:event.id,changes}:{...changes,minutes:15,repeatDays:0}});router.push({pathname:'/review',params:{id:p.id}});
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Screen><Title>{event?'Care details':'Add care'}</Title><Label>{pet?.name||'Choose a pet in My pets'}</Label><Button secondary icon="chat" title="Plan this with Pip" onPress={()=>router.push({pathname:'/pet-chat',params:{draft:event?`Help me change ${event.title}.`:'Help me add a care reminder.'}})}/><Field label="Care or appointment" value={title} onChange={setTitle}/><DateField value={when} onChange={setWhen}/><Field label="Place (optional)" value={place} onChange={setPlace}/><Heading>Repeat</Heading><View style={s.wrap}>{(['once','day','week','month','year'] as const).map(u=><Chip key={u} title={u==='once'?'Once':u==='day'?'Daily':u==='week'?'Weekly':u==='month'?'Monthly':'Yearly'} active={unit===u} onPress={()=>{setUnit(u);setInterval('1');}}/>)}</View>{unit!=='once'&&<Field label={`Every how many ${unit}s?`} keyboardType="number-pad" value={interval} onChange={setInterval}/>}<Field label="Remind me how many minutes before?" keyboardType="number-pad" value={lead} onChange={setLead}/><Card><Heading>Use a recorded supply</Heading><Label small>Optional. Only enter the amount already agreed with your vet or on the product instructions.</Label><View style={s.wrap}><Chip title="None" active={!stock} onPress={()=>setStock('')}/>{app.account?.inventory?.filter(i=>i.petId===pet?.id).map(i=><Chip key={i.id} title={i.product} active={stock===i.id} onPress={()=>setStock(i.id)}/>)}</View>{!!stock&&<Field label={`Quantity per completion (${app.account?.inventory?.find(i=>i.id===stock)?.unit})`} value={used} onChange={setUsed} keyboardType="decimal-pad"/>}</Card><ErrorText message={error}/><Button title="Review care item" busy={busy} onPress={()=>void review()}/>{event&&<Button secondary title="Review cancellation" disabled={busy} onPress={()=>void review(true)}/>}<Button secondary title="Back to calendar" onPress={()=>router.back()}/></Screen>;
}
