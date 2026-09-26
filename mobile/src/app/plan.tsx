import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { Button, Card, Chip, ErrorText, Field, Label, Screen, Title, s } from '../ui';
import DateField from '../DateField';
import { ideas } from '../catalog';
export default function Plan() {
  const app=useApp(), params=useLocalSearchParams<{title?:string;replace?:string}>();
  const previous=params.replace?app.activeProposal:null, data=previous?.data;
  const [title,setTitle]=useState(String(data?.title||params.title||'')),[when,setWhen]=useState(() => data?.startAt?new Date(String(data.startAt)):new Date(Date.now()+3600000)),[minutes,setMinutes]=useState(String(data?.minutes||10)),[place,setPlace]=useState(String(data?.location||'')),[repeat,setRepeat]=useState(Number(data?.repeatDays||0)),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function review() { if(!app.account){router.push('/account');return;}if(!app.selected){router.push('/pet-editor');return;}setBusy(true);setError('');try{await app.propose({action:'plan',petId:previous?.petId||app.selected.id,data:{title,startAt:when.toISOString(),minutes:Number(minutes),location:place,repeatDays:repeat},replaceId:params.replace});router.replace('/review');}catch(e){setError((e as Error).message);}finally{setBusy(false);} }
  return <Screen><Title>{app.selected?`A little time\nwith ${app.selected.name}.`:'Something together.'}</Title>{!app.selected&&<Card><Label>Meet your pet to save a plan that belongs to them.</Label><Button title="Meet my pet" onPress={()=>router.push('/pet-editor')}/></Card>}<Field label="What shall we do?" value={title} onChange={setTitle} placeholder="An activity, appointment or care task"/><View style={s.wrap}>{ideas(app.selected).map(i=><Chip key={i} title={i} onPress={()=>setTitle(i)} active={title===i}/>)}</View><DateField value={when} onChange={setWhen}/><Field label="Minutes" value={minutes} onChange={setMinutes} keyboardType="number-pad"/><Field label="Place (optional)" value={place} onChange={setPlace} placeholder="At home, a favourite spot…"/><Label small>Repeat</Label><View style={s.wrap}>{[[0,'Just once'],[1,'Daily'],[7,'Weekly']].map(([n,label])=><Chip key={n} title={String(label)} active={repeat===n} onPress={()=>setRepeat(Number(n))}/>)}</View><ErrorText message={error}/><Button title="Review plan" busy={busy} onPress={()=>void review()}/><Label small muted>Planning records your own arrangements. It does not book a service or change treatment instructions.</Label></Screen>;
}
