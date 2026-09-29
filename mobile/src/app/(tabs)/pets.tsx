import { Pressable } from '../../FeedbackPressable';
import React, { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../../state';
import { AttentionBadge } from '../../AttentionBadge';
import { PipSectionArt } from '../../PipSectionArt';
import { Avatar, Button, C, Icon, Label, Screen, Title } from '../../ui';
export default function Pets() {
  const app=useApp(),pet=app.selected,refresh=app.refresh;
  useFocusEffect(useCallback(()=>{void refresh();const timer=setInterval(()=>void refresh(),60000);return()=>clearInterval(timer);},[refresh]));
  return <Screen><Title>My pets</Title>
    <View testID="my-pets-intro" style={{alignItems:'center',gap:18,paddingVertical:12,maxWidth:480,width:'100%',alignSelf:'center'}}>
      <Pressable testID="pet-chat-launch" accessibilityRole="button" accessibilityLabel={pet?`Talk about ${pet.name} with Pip`:'Talk about your pet with Pip'} accessibilityHint="Opens a full-screen conversation. Microphone permission is requested before recording." onPress={()=>router.push({pathname:'/pet-chat',params:{voice:'ask'}})} style={({pressed})=>({width:254,height:206,alignItems:'center',justifyContent:'center',opacity:pressed?.8:1})}>
        <View pointerEvents="none"><PipSectionArt scene="pets" species={pet?.species} petName={pet?.name}/></View>
        <View pointerEvents="none" style={{position:'absolute',bottom:0,right:6,width:54,height:54,borderRadius:27,backgroundColor:C.ink,borderWidth:4,borderColor:C.paper,alignItems:'center',justifyContent:'center'}}><Icon name="mic" size={27} color="white"/></View>
      </Pressable>
      <Label style={{textAlign:'center'}}>Here you can talk about your pet. I&apos;ll do my best to organise events, feeding schedules and care appointment reminders.</Label>
    </View>
    {!!app.account?.pets.length&&<ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{gap:12,padding:4}}>{app.account.pets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Open ${p.name}'s profile`} accessibilityState={{selected:pet?.id===p.id}} onPress={()=>{app.select(p.id);router.push({pathname:'/pet-editor',params:{id:p.id}});}} style={{alignItems:'center',gap:6,padding:12,borderRadius:24,borderWidth:2,borderColor:pet?.id===p.id?C.ink:C.line}}><Avatar species={p.species} size={56}/><View style={{flexDirection:'row',alignItems:'center',gap:6}}><Label small>{p.name}</Label><Icon name="arrow" size={16}/></View><View style={{position:'absolute',right:0,top:0}}><AttentionBadge count={(app.account?.attention||[]).filter(item=>item.petId===p.id).length}/></View></Pressable>)}</ScrollView>}
    <Button title="Add a new pet" icon="plus" onPress={()=>router.push('/pet-editor')}/>
  </Screen>;
}
