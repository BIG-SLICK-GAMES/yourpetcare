import { Pressable } from '../../FeedbackPressable';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../../state';
import { AttentionBadge } from '../../AttentionBadge';
import { Avatar, Button, Card, Heading, Screen, Title } from '../../ui';
export default function Pets() {
  const app=useApp();
  const refresh=app.refresh;
  useFocusEffect(useCallback(()=>{void refresh();const timer=setInterval(()=>void refresh(),60000);return()=>clearInterval(timer);},[refresh]));
  return <Screen wide><Title>My pets</Title><View testID="pet-grid" style={{gap:20}}>{app.account?.pets.map(p=>{
    const count=(app.account?.attention||[]).filter(item=>item.petId===p.id).length;
    return <Card key={p.id}><View style={{alignItems:'center',gap:8}}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${p.name}'s profile`} onPress={()=>router.push({pathname:'/pet-editor',params:{id:p.id}})} style={{alignItems:'center',gap:10,padding:8}}><Avatar species={p.species} size={96}/><Heading center>{p.name}</Heading></Pressable>
      {!!count&&<Pressable accessibilityRole="button" accessibilityLabel={`${count} actions for ${p.name}. Open dashboard`} onPress={()=>{app.select(p.id);router.navigate('/home');}} style={{position:'absolute',top:0,right:0,padding:10,minWidth:44,minHeight:44}}><AttentionBadge count={count}/></Pressable>}
    </View></Card>;
  })}</View>{!app.account?.pets.length&&<Card><View style={{alignItems:'center',gap:12}}><Avatar size={110}/><Heading center>Add your first pet</Heading></View></Card>}<Button title="Add a pet" icon="plus" onPress={()=>router.push('/pet-editor')}/></Screen>;
}
