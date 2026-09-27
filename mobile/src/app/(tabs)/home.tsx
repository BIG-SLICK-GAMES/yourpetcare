import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Speech from 'expo-speech';
import { router, useFocusEffect } from 'expo-router';
import { reminderSchedule } from '../../reminder-schedule';
import { useApp } from '../../state';
import { Avatar, Button, C, Card, CircleButton, Heading, Icon, Label, Screen, Title, s } from '../../ui';
import { TalkingPip } from '../../Pip';
import { BrandLogo } from '../../BrandLogo';

export default function Home(){
  const app=useApp(),pet=app.selected;
  const [now,setNow]=useState(()=>Date.now());
  useFocusEffect(useCallback(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),60000);return()=>{clearInterval(timer);void Speech.stop();};},[]));
  const events=reminderSchedule((app.account?.events||[]).filter(e=>!pet||e.petId===pet.id),now,3);
  const talk=()=>router.navigate({pathname:'/',params:{mode:'chat'}});
  return <Screen><BrandLogo width={360}/>
    <View style={{alignItems:'center',gap:14}}><Pressable accessibilityRole="button" accessibilityLabel="Help & tutorials" onPress={()=>router.push('/help')} style={{position:'absolute',right:0,top:0,padding:12,zIndex:1}}><Icon name="help"/></Pressable><TalkingPip size={110} words={pet?`Welcome home. How is ${pet.name} today? Tell me what you need and we’ll do it together.`:'Welcome home. Let’s meet your pet, or have a look around.'}/><View style={{width:'100%',backgroundColor:'white',padding:22,borderRadius:25,gap:8}}><Title>{pet?`You & ${pet.name}.`:'Your little home.'}</Title><Label>{pet?'A little help for today. What shall we do together?':'Meet your pet, then let me help with the little things.'}</Label><Button title={pet?'Talk to Pip':'Meet my pet with Pip'} icon={pet?'chat':'paw'} onPress={()=>pet?talk():router.navigate({pathname:'/',params:{mode:'setup'}})}/></View></View>
    {!!app.account?.pets.length&&<View style={[s.wrap,{gap:12}]}>{app.account.pets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Choose ${p.name}`} accessibilityState={{selected:p.id===pet?.id}} onPress={()=>app.select(p.id)} style={{alignItems:'center',gap:6,padding:8,borderRadius:20,borderWidth:2,borderColor:p.id===pet?.id?C.ink:'transparent'}}><Avatar species={p.species} size={52}/><Label small>{p.name}</Label></Pressable>)}</View>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}><CircleButton title="My pets" icon="paw" onPress={()=>router.push('/pets')}/><CircleButton title="Places" icon="map" color={C.blue} onPress={()=>router.push('/map')}/><CircleButton title="Plan" icon="calendar" color={C.gold} onPress={()=>router.push('/plan')}/><CircleButton title="Help" icon="help" color={C.peach} onPress={()=>router.push('/help')}/></ScrollView>
    <View style={s.between}><Heading>Coming up{pet?` for ${pet.name}`:''}</Heading><Pressable accessibilityRole="button" accessibilityLabel="Open calendar" onPress={()=>router.push('/calendar')} style={{padding:12}}><Icon name="calendar"/></Pressable></View>
    {events.length?events.map(({event,at})=><Card key={`${event.id}-${at}`}><Heading>{event.title}</Heading><Label>{new Date(at).toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</Label>{!!event.location&&<Label small muted>{event.location}</Label>}</Card>):<Card color={C.sage}><Label>No plans yet. We can start with one small thing.</Label><Button secondary title="Plan something together" onPress={()=>router.push('/plan')}/></Card>}
    {!app.online&&<Label small muted>You can browse while we reconnect.</Label>}
  </Screen>;
}
