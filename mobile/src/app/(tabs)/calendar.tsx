import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../state';
import { Button, Card, Chip, ErrorText, Heading, Icon, Label, Screen, Title, s } from '../../ui';
import { enableReminders } from '../../reminders';
export default function Calendar() {
  const app=useApp(),[filter,setFilter]=useState('upcoming'),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const events=(app.account?.events||[]).filter(e=>filter==='completed'?e.status==='completed':e.status==='planned').sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));
  async function complete(id:string,petId:string){try{await app.propose({action:'complete_event',petId,data:{eventId:id}});router.push('/review');}catch(e){setError((e as Error).message);}}
  async function reminders(){if(!app.account)return;try{await enableReminders(app.account);setNotice('Device reminders are on. The next 50 reminders are scheduled. Open the app regularly to refresh them; check times after travel or daylight-saving changes.');}catch(e){setError((e as Error).message);}}
  return <Screen wide><Title>Care schedule</Title><View style={s.wrap}><Chip title="Coming up" active={filter==='upcoming'} onPress={()=>setFilter('upcoming')}/><Chip title="Completed" active={filter==='completed'} onPress={()=>setFilter('completed')}/></View><Button title="Plan something" icon="plus" onPress={()=>router.push('/plan')}/><ErrorText message={error}/>{notice&&<Label>{notice}</Label>}<View testID="calendar-grid" style={{gap:20}}>{events.map(e=><Card key={e.id}><View style={s.row}><Icon name="calendar" size={31}/><View style={{flex:1}}><Label small muted>{new Date(e.startAt).toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</Label><Heading>{e.title}</Heading><Label>{app.account?.pets.find(p=>p.id===e.petId)?.name}{e.location?` · ${e.location}`:''}</Label>{e.repeatDays>0&&<Label small muted>Every {e.repeatDays} days</Label>}</View></View>{e.status==='planned'&&<Button secondary title="Mark complete" onPress={()=>void complete(e.id,e.petId)}/>}</Card>)}</View>{!events.length&&<Card><Heading>{filter==='completed'?'No completed plans':'No plans yet'}</Heading></Card>}{app.account&&<Button secondary title="Enable device reminders" icon="calendar" onPress={()=>void reminders()}/>}</Screen>;
}
