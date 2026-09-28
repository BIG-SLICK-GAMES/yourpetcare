import React, { useCallback, useReducer, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { emptyPreview, exampleContext, previewAction, previewRules, type NoticeKind } from './companion-preview';
import { Button, C, Card, Chip, Heading, Icon, Label, s } from './ui';
import { Pip } from './Pip';

export function CompanionPreview({compact=false}:{compact?:boolean}){
  const [state,dispatch]=useReducer(previewAction,undefined,emptyPreview),[kind,setKind]=useState<NoticeKind>('treatment');
  useFocusEffect(useCallback(()=>()=>{dispatch({type:'reset'});setKind('treatment');},[]));
  const notices=previewRules.notices(exampleContext),notice=notices.find(n=>n.id===kind)!;
  const reminderAdded=state.reminders.some(r=>r.id===kind)||state.history.some(r=>r.id===kind),shoppingAdded=state.shopping.some(r=>r.id===kind);
  if(compact)return <Card color={C.sage}><View style={s.row}><Pip size={42}/><View style={{flex:1}}><Heading>Your companion, in action</Heading><Label small>Example only: fictional Stormy</Label></View></View><Label>{notice.message}</Label><Label small>See how a recorded care need could become a reminder or shopping item. This preview never changes your profile.</Label><Button secondary title="Explore the companion preview" icon="play" onPress={()=>router.push('/companion-demo')}/></Card>;
  return <Card color={C.sage}><View style={s.row}><Pip size={42}/><View style={{flex:1}}><Heading>Your companion, in action</Heading><Label small>Interactive example · fictional Stormy</Label></View></View>
    {!compact&&<View style={s.wrap}>{(['treatment','vaccination','food'] as NoticeKind[]).map(id=><Chip key={id} title={{treatment:'Treatment',vaccination:'Vaccination',food:'Food'}[id]} active={kind===id} onPress={()=>setKind(id)}/>)}</View>}
    {state.dismissed.includes(kind)?<Label>That can wait. You choose the next step.</Label>:<><Heading>{notice.title}</Heading><Label>{notice.message}</Label><Label small>{notice.evidence}</Label>
      {notice.reminder&&<Button title={reminderAdded?'Demo reminder added':'Add demo reminder'} icon="calendar" disabled={reminderAdded} onPress={()=>dispatch({type:'reminder',notice})}/>}
      {notice.shopping&&<Button secondary title={shoppingAdded?'Added to demo shopping list':'Add to demo shopping list'} icon="food" disabled={shoppingAdded} onPress={()=>dispatch({type:'shopping',notice})}/>}
      {kind==='vaccination'&&<Button secondary title="Browse real vets nearby" icon="map" onPress={()=>router.push({pathname:'/map',params:{category:'vet'}})}/>}
      <Button secondary title="Not now" onPress={()=>dispatch({type:'dismiss',id:kind})}/></>}
    {!!state.receipt&&<View accessibilityLiveRegion="polite"><Label>{state.receipt}</Label></View>}
    {!compact&&<><Heading>Demo care schedule</Heading>{!state.reminders.length&&<Label small>No demo reminders waiting.</Label>}{state.reminders.map(r=><View key={r.id} style={{gap:8}}><Label>{r.title}</Label><Button secondary title={`Complete demo ${r.title.toLowerCase()}`} icon="check" onPress={()=>dispatch({type:'complete',id:r.id})}/></View>)}
      <Heading>Demo shopping list</Heading>{state.shopping.length?state.shopping.map(r=><Label key={r.id}>{r.title}</Label>):<Label small>No demo shopping items.</Label>}
      <Heading>Demo history</Heading>{state.history.length?state.history.map(r=><View key={r.id} style={s.row}><Icon name="check" size={18}/><Label>{r.title} completed</Label></View>):<Label small>Completed demo care will appear here.</Label>}</>}
    <Label small>Example only. Nothing is saved to your profile or sent to AI. The public app does not yet track stock or shopping lists.</Label>
    {compact&&<Button secondary title="Explore the companion preview" icon="play" onPress={()=>router.push('/companion-demo')}/>}
    <Button secondary title="Reset example" onPress={()=>dispatch({type:'reset'})}/>
  </Card>;
}
