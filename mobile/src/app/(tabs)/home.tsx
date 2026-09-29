import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Speech from 'expo-speech';
import { router, useFocusEffect } from 'expo-router';
import { reminderSchedule } from '../../reminder-schedule';
import { useApp } from '../../state';
import { Avatar, Button, C, Card, CircleButton, ErrorText, Heading, Icon, Label, Screen, s } from '../../ui';
import { TalkingPip } from '../../Pip';
import { CompanionPreview } from '../../CompanionPreview';
import { DashboardActions } from '../../DashboardActions';
import { AttentionBadge } from '../../AttentionBadge';
import { BrandHeader } from '../../BrandLogo';

export default function Home(){
  const app=useApp(),pet=app.selected;
  const [signingOut,setSigningOut]=useState(false),[error,setError]=useState('');
  async function signOut(){setSigningOut(true);setError('');try{await app.logout();}catch(e){setError((e as Error).message);}finally{setSigningOut(false);}}
  const [now,setNow]=useState(()=>Date.now());
  useFocusEffect(useCallback(()=>{setNow(Date.now());void app.refresh();const timer=setInterval(()=>{setNow(Date.now());void app.refresh();},60000);return()=>{clearInterval(timer);void Speech.stop();};},[app.refresh]));
  const events=reminderSchedule((app.account?.events||[]).filter(e=>!pet||e.petId===pet.id),now,3);
  const talk=()=>router.navigate({pathname:'/',params:{mode:'chat'}});
  return <Screen wide scrollHint><BrandHeader onSignIn={!app.account?()=>router.push('/account'):undefined} onSignOut={app.account?()=>void signOut():undefined} busy={signingOut}/><ErrorText message={error}/><View testID="home-columns" style={{gap:24}}><View testID="home-companion" style={{gap:20}}>
    <View style={{alignItems:'center',gap:14}}><Pressable accessibilityRole="button" accessibilityLabel="Help & tutorials" onPress={()=>router.push('/help')} style={{position:'absolute',right:0,top:0,padding:12,zIndex:1}}><Icon name="help"/></Pressable><TalkingPip size={180} words={pet?`Hi! How is ${pet.name} today?`:'Hi! I’m Pip. Let’s meet your pet.'}/><View style={{width:'100%',backgroundColor:'white',padding:22,borderRadius:25,gap:8}}><Button title={pet?'Talk to Pip':'Meet my pet with Pip'} icon={pet?'chat':'paw'} onPress={()=>pet?talk():router.navigate({pathname:'/',params:{mode:'setup'}})}/></View></View>
    {!!app.account?.pets.length&&<View style={[s.wrap,{gap:12}]}>{app.account.pets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Choose ${p.name}${(app.account?.attention||[]).filter(item=>item.petId===p.id).length?`, ${(app.account?.attention||[]).filter(item=>item.petId===p.id).length} actions waiting`:''}`} accessibilityState={{selected:p.id===pet?.id}} onPress={()=>app.select(p.id)} style={{alignItems:'center',gap:6,padding:8,borderRadius:20,borderWidth:2,borderColor:p.id===pet?.id?C.ink:'transparent'}}><Avatar species={p.species} size={52}/><Label small>{p.name}</Label><View style={{position:'absolute',right:0,top:0}}><AttentionBadge count={(app.account?.attention||[]).filter(item=>item.petId===p.id).length}/></View></Pressable>)}</View>}
    <DashboardActions/></View><View testID="home-today" style={{gap:20}}><ScrollView horizontal style={{flexGrow:0}} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}><CircleButton title="My pets" icon="paw" onPress={()=>router.push('/pets')}/><CircleButton title="Care Around You" icon="map" color={C.blue} onPress={()=>router.push('/map')}/><CircleButton title="Shopping" icon="shop" color={C.lavender} onPress={()=>router.push('/shopping')}/><CircleButton title="Plan" icon="calendar" color={C.gold} onPress={()=>router.push('/plan')}/><CircleButton title="Help" icon="help" color={C.peach} onPress={()=>router.push('/help')}/></ScrollView>
    <View style={s.between}><Heading>Coming up{pet?` for ${pet.name}`:''}</Heading><Pressable accessibilityRole="button" accessibilityLabel="Open calendar" onPress={()=>router.push('/calendar')} style={{padding:12}}><Icon name="calendar"/></Pressable></View>
    {events.length?events.map(({event,at})=><Card key={`${event.id}-${at}`}><Heading>{event.title}</Heading><Label>{new Date(at).toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</Label>{!!event.location&&<Label small muted>{event.location}</Label>}</Card>):<Card color={C.sage}><Label>No plans yet. We can start with one small thing.</Label><Button secondary title="Plan something together" onPress={()=>router.push('/plan')}/></Card>}
    <CompanionPreview compact/><Button secondary title="How it works" icon="help" onPress={()=>router.push('/how-it-works')}/></View></View>{!app.online&&<Label small muted>You can browse while we reconnect.</Label>}
  </Screen>;
}
