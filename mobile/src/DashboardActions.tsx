import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from './state';
import { AttentionItem } from './types';
import { AttentionBadge } from './AttentionBadge';
import { Button, C, Card, ErrorText, Heading, Label, s } from './ui';

export function DashboardActions({petId,hideWhenEmpty=false,choicesOnly=false}:{petId?:string;hideWhenEmpty?:boolean;choicesOnly?:boolean}={}){
  const app=useApp(),items=(app.account?.attention||[]).filter(item=>(!choicesOnly||item.kind==='choice')&&(!petId||!item.petId||item.petId===petId));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[dismissed,setDismissed]=useState<AttentionItem|null>(null);
  async function dismiss(item:AttentionItem){setBusy(true);setError('');try{await app.attention(item.id,'dismiss');setDismissed(item);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function undo(){if(!dismissed)return;setBusy(true);setError('');try{await app.attention(dismissed.id,'restore');setDismissed(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function open(item:AttentionItem){if(item.petId)app.select(item.petId);setBusy(true);setError('');try{if(item.kind==='event')await app.propose({action:'complete_event',petId:item.petId!,data:{eventId:item.targetId}});router.push(item.kind==='choice'?{pathname:'/review',params:{id:item.targetId}}:'/review');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(!app.account||(hideWhenEmpty&&!items.length&&!dismissed))return null;
  return <View testID="dashboard-actions" style={{gap:14}}><View style={s.row}><Heading>Needs a little attention</Heading><AttentionBadge count={items.length}/></View>
    <ErrorText message={error}/>
    {dismissed&&<Card color={C.sage}><Label>Dismissed {dismissed.title}. {dismissed.kind==='event'?'Your calendar is unchanged.':'The choice is still available until it expires.'}</Label><Button secondary title="Undo dismissal" busy={busy} onPress={()=>void undo()}/></Card>}
    {!items.length&&<Label>All caught up for now.</Label>}
    {items.map(item=><Card key={item.id}><Label small muted>{app.account?.pets.find(p=>p.id===item.petId)?.name||'You'} · {item.kind==='choice'?'Your choice':'Due reminder'}</Label><Heading>{item.title}</Heading>{item.kind==='event'&&<Label small>{new Date(item.at).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</Label>}
      <Button title={item.kind==='choice'?'Review choice':'Mark done'} icon="check" busy={busy} onPress={()=>void open(item)}/>
      <Button secondary title={`Dismiss ${item.title}`} disabled={busy} onPress={()=>void dismiss(item)}/>
    </Card>)}
  </View>;
}
