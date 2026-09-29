import { Pressable } from '../../FeedbackPressable';
import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../../state';
import { AttentionBadge } from '../../AttentionBadge';
import { PipAssistant } from '../../PipAssistant';
import { Avatar, C, Label, Screen, Title } from '../../ui';
export default function Pets() {
  const app=useApp(),pet=app.selected,refresh=app.refresh;
  useFocusEffect(useCallback(()=>{void refresh();const timer=setInterval(()=>void refresh(),60000);return()=>clearInterval(timer);},[refresh]));
  return <Screen><Title>My pets</Title>
    <PipAssistant prompt={pet?`What does ${pet.name} need today?`:'Tell me about your first pet.'}/>
    {!!app.account?.pets.length&&<ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{gap:12,padding:4}}>{app.account.pets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Talk about ${p.name}`} accessibilityState={{selected:pet?.id===p.id}} onPress={()=>app.select(p.id)} style={{alignItems:'center',gap:6,padding:12,borderRadius:24,borderWidth:2,borderColor:pet?.id===p.id?C.ink:C.line}}><Avatar species={p.species} size={56}/><Label small>{p.name}</Label><View style={{position:'absolute',right:0,top:0}}><AttentionBadge count={(app.account?.attention||[]).filter(item=>item.petId===p.id).length}/></View></Pressable>)}</ScrollView>}
    {pet&&<Pressable accessibilityRole="button" accessibilityLabel={`View ${pet.name}'s profile`} onPress={()=>router.push({pathname:'/pet-editor',params:{id:pet.id}})} style={{alignSelf:'center',minHeight:44,justifyContent:'center',paddingHorizontal:16}}><Label small>{pet.name}'s profile</Label></Pressable>}
  </Screen>;
}
