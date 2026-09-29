import { RetailerInvitation } from '../../RetailerDiscovery';
import { Pressable } from '../../FeedbackPressable';
import { InlinePipChat } from '../../InlinePipChat';
import { PipOrbitMenu } from '../../PipOrbitMenu';
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { reminderSchedule } from '../../reminder-schedule';
import { useApp } from '../../state';
import { Avatar, Button, C, Card, ErrorText, Heading, Icon, Label, Screen, s } from '../../ui';
import { DashboardActions } from '../../DashboardActions';
import { AttentionBadge } from '../../AttentionBadge';
import { BrandHeader } from '../../BrandLogo';

export default function Home(){
  const app=useApp(),pet=app.selected;
  const [chatOpen,setChatOpen]=useState(false);
  const dashboardScroll=useRef<ScrollView>(null);
  const [menuTouched,setMenuTouched]=useState(false);
  const [signingOut,setSigningOut]=useState(false),[error,setError]=useState('');
  async function signOut(){setSigningOut(true);setError('');try{await app.logout();}catch(e){setError((e as Error).message);}finally{setSigningOut(false);}}
  const [now,setNow]=useState(()=>Date.now());
  const refresh=app.refresh;
  useFocusEffect(useCallback(()=>{setNow(Date.now());void refresh();const timer=setInterval(()=>{setNow(Date.now());void refresh();},60000);return()=>clearInterval(timer);},[refresh]));
  const events=reminderSchedule((app.account?.events||[]).filter(e=>!pet||e.petId===pet.id),now,3);
  return <Screen wide scrollHint scrollEnabled={!menuTouched} scrollViewRef={dashboardScroll}><View testID="home-dashboard" style={{width:'100%',maxWidth:600,alignSelf:'center',gap:20}}>
    <BrandHeader onSignIn={!app.account?()=>router.push('/account'):undefined} onSignOut={app.account?()=>void signOut():undefined} busy={signingOut}/><ErrorText message={error}/><PipOrbitMenu chatOpen={chatOpen} onInteractionChange={setMenuTouched} onTalk={()=>setChatOpen(value=>!value)}/>{chatOpen&&<View onLayout={e=>dashboardScroll.current?.scrollTo({y:e.nativeEvent.layout.y,animated:false})}><InlinePipChat key={`${app.account?.id||'guest'}-${pet?.id||'welcome'}`} onClose={()=>setChatOpen(false)}/></View>}
    {!!app.account?.pets.length&&<ScrollView testID="home-pet-chooser" horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{gap:12,paddingTop:4}}>{app.account.pets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Choose ${p.name}${(app.account?.attention||[]).filter(item=>item.petId===p.id).length?`, ${(app.account?.attention||[]).filter(item=>item.petId===p.id).length} actions waiting`:''}`} accessibilityState={{selected:p.id===pet?.id}} onPress={()=>app.select(p.id)} style={{alignItems:'center',gap:6,padding:8,borderRadius:20,borderWidth:2,borderColor:p.id===pet?.id?C.ink:'transparent'}}><Avatar species={p.species} size={52}/><Label small>{p.name}</Label><View style={{position:'absolute',right:0,top:0}}><AttentionBadge count={(app.account?.attention||[]).filter(item=>item.petId===p.id).length}/></View></Pressable>)}</ScrollView>}

    {!app.account?.pets.length&&<Button title="Add my pet" icon="paw" onPress={()=>router.navigate({pathname:'/',params:{mode:'setup',voice:undefined}})}/>}
    <View testID="home-coming-up" style={{gap:14}}>
      <View style={s.between}><View style={{flex:1}}><Heading>Coming up{pet?` for ${pet.name}`:''}</Heading></View><Pressable accessibilityRole="button" accessibilityLabel="Open calendar" onPress={()=>router.push('/calendar')} style={{padding:12}}><Icon name="calendar"/></Pressable></View>
      {events.length?events.map(({event,at})=><Card key={`${event.id}-${at}`}><Heading>{event.title}</Heading><Label>{new Date(at).toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</Label>{!!event.location&&<Label small muted>{event.location}</Label>}</Card>):<Card color={C.sage}><Label>No upcoming plans yet.</Label></Card>}
      <DashboardActions key={pet?.id||'account'} petId={pet?.id} hideWhenEmpty/>
    </View>
    <RetailerInvitation/>
    {!app.online&&<Label small muted>You can browse while we reconnect.</Label>}
  </View></Screen>;
}
