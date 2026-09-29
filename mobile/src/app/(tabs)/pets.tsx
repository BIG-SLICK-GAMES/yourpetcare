import { Pressable } from '../../FeedbackPressable';
import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../../state';
import { AttentionBadge } from '../../AttentionBadge';
import { PipAssistant } from '../../PipAssistant';
import { Avatar, C, Icon, Label, Screen, Title } from '../../ui';
export default function Pets() {
  const app=useApp(),pet=app.selected,refresh=app.refresh;
  useFocusEffect(useCallback(()=>{void refresh();const timer=setInterval(()=>void refresh(),60000);return()=>clearInterval(timer);},[refresh]));
  return <Screen><Title>My pets</Title>
    <PipAssistant scene="pets" prompt={pet?`What does ${pet.name} need today?`:'Tell me about your first pet.'}/>
    {!!app.account?.pets.length&&<ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{gap:12,padding:4}}>{app.account.pets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Open ${p.name}'s profile`} accessibilityState={{selected:pet?.id===p.id}} onPress={()=>{app.select(p.id);router.push({pathname:'/pet-editor',params:{id:p.id}});}} style={{alignItems:'center',gap:6,padding:12,borderRadius:24,borderWidth:2,borderColor:pet?.id===p.id?C.ink:C.line}}><Avatar species={p.species} size={56}/><View style={{flexDirection:'row',alignItems:'center',gap:6}}><Label small>{p.name}</Label><Icon name="arrow" size={16}/></View><View style={{position:'absolute',right:0,top:0}}><AttentionBadge count={(app.account?.attention||[]).filter(item=>item.petId===p.id).length}/></View></Pressable>)}</ScrollView>}

  </Screen>;
}
