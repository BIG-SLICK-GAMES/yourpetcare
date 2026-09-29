import { conversationTopics } from '../../conversation-topics';
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
  const refresh=app.refresh;
  useFocusEffect(useCallback(()=>{setNow(Date.now());void refresh();const timer=setInterval(()=>{setNow(Date.now());void refresh();},60000);return()=>{clearInterval(timer);void Speech.stop();};},[refresh]));
  const events=reminderSchedule((app.account?.events||[]).filter(e=>!pet||e.petId===pet.id),now,3);
  const talk=()=>router.navigate({pathname:'/',params:{mode:'chat',voice:'ask',draft:undefined}});
  const [topicsWidth,setTopicsWidth]=useState(0),[topicsContent,setTopicsContent]=useState(0);
  return <Screen wide scrollHint><BrandHeader onSignIn={!app.account?()=>router.push('/account'):undefined} onSignOut={app.account?()=>void signOut():undefined} busy={signingOut}/><ErrorText message={error}/><View testID="home-columns" style={{gap:24}}><View testID="home-companion" style={{gap:20}}>
    {!!app.account?.pets.length&&<ScrollView testID="home-pet-chooser" horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{gap:12,paddingTop:4}}>{app.account.pets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Choose ${p.name}${(app.account?.attention||[]).filter(item=>item.petId===p.id).length?`, ${(app.account?.attention||[]).filter(item=>item.petId===p.id).length} actions waiting`:''}`} accessibilityState={{selected:p.id===pet?.id}} onPress={()=>app.select(p.id)} style={{alignItems:'center',gap:6,padding:8,borderRadius:20,borderWidth:2,borderColor:p.id===pet?.id?C.ink:'transparent'}}><Avatar species={p.species} size={52}/><Label small>{p.name}</Label><View style={{position:'absolute',right:0,top:0}}><AttentionBadge count={(app.account?.attention||[]).filter(item=>item.petId===p.id).length}/></View></Pressable>)}</ScrollView>}
    <View testID="home-microphone" style={{width:'100%',maxWidth:340,alignSelf:'center',alignItems:'center',paddingVertical:6,gap:6}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Talk to Pip with microphone" onPress={talk} style={({pressed})=>({width:82,height:82,borderRadius:41,backgroundColor:C.ink,alignItems:'center',justifyContent:'center',opacity:pressed?.75:1})}><Icon name="mic" color="white" size={36}/></Pressable><Label small muted>Tap to talk</Label>
      <View testID="home-floating-pip" style={{position:'absolute',right:0,top:3}}><TalkingPip size={68} showHint={false} words={pet?`Hi! Ready to talk about ${pet.name}? Tap the microphone or choose a topic.`:'Hi! I’m Pip. Choose a topic, or let’s meet your pet.'}/></View>
    </View>
    <View style={{gap:6}}>{topicsContent>topicsWidth+1&&<Label small muted style={{textAlign:'right'}}>Swipe for topics →</Label>}
      <ScrollView testID="home-conversation-topics" horizontal showsHorizontalScrollIndicator={false} onLayout={e=>setTopicsWidth(e.nativeEvent.layout.width)} onContentSizeChange={w=>setTopicsContent(w)} style={{flexGrow:0}} contentContainerStyle={{gap:12,paddingVertical:4}}>{conversationTopics.map(topic=><CircleButton key={topic.title} title={topic.title} icon={topic.icon} color={topic.color} onPress={()=>router.navigate({pathname:'/',params:{mode:'chat',draft:topic.draft,voice:undefined}})}/>)}</ScrollView>
      <Button secondary title="Or type to Pip" icon="chat" onPress={()=>router.navigate({pathname:'/',params:{mode:'chat',voice:undefined}})}/>
    </View>
    <View testID="home-pet-overview" style={{gap:12}}>{pet?<Card><Pressable accessibilityRole="button" accessibilityLabel={`Open ${pet.name}'s profile`} onPress={()=>router.push({pathname:'/pet-editor',params:{id:pet.id}})} style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:60}}><Avatar species={pet.species} size={56}/><View style={{flex:1}}><Heading>{pet.name}</Heading></View><AttentionBadge count={(app.account?.attention||[]).filter(item=>item.petId===pet.id).length}/><Icon name="arrow"/></Pressable></Card>:<Button title="Meet my pet with Pip" icon="paw" onPress={()=>router.navigate({pathname:'/',params:{mode:'setup',voice:undefined}})}/>}</View>
    <DashboardActions/></View><View testID="home-today" style={{gap:20}}><ScrollView horizontal style={{flexGrow:0}} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}><CircleButton title="My pets" icon="paw" onPress={()=>router.push('/pets')}/><CircleButton title="Care Around You" icon="map" color={C.blue} onPress={()=>router.push('/map')}/><CircleButton title="Shopping" icon="shop" color={C.lavender} onPress={()=>router.push('/shopping')}/><CircleButton title="Plan" icon="calendar" color={C.gold} onPress={()=>router.push('/plan')}/><CircleButton title="Help" icon="help" color={C.peach} onPress={()=>router.push('/help')}/></ScrollView>
    <View style={s.between}><Heading>Coming up{pet?` for ${pet.name}`:''}</Heading><Pressable accessibilityRole="button" accessibilityLabel="Open calendar" onPress={()=>router.push('/calendar')} style={{padding:12}}><Icon name="calendar"/></Pressable></View>
    {events.length?events.map(({event,at})=><Card key={`${event.id}-${at}`}><Heading>{event.title}</Heading><Label>{new Date(at).toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</Label>{!!event.location&&<Label small muted>{event.location}</Label>}</Card>):<Card color={C.sage}><Label>No plans yet. We can start with one small thing.</Label><Button secondary title="Plan something together" onPress={()=>router.push('/plan')}/></Card>}
    <CompanionPreview compact/><Button secondary title="How it works" icon="help" onPress={()=>router.push('/how-it-works')}/></View></View>{!app.online&&<Label small muted>You can browse while we reconnect.</Label>}
  </Screen>;
}
