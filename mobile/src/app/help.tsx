import { Pressable } from '../FeedbackPressable';
import React, { useState } from 'react';
import { router } from 'expo-router';
import { Modal, View } from 'react-native';
import { PipAssistant } from '../PipAssistant';
import { AnimatedHelp, helpFilms, type HelpFilm } from '../AnimatedHelp';
import { useWelcomeIntro } from '../WelcomeIntro';
import { Button, C, Heading, Icon, Label, Screen, Title } from '../ui';

export default function Help(){
  const replay=useWelcomeIntro(),[film,setFilm]=useState<HelpFilm|null>(null);
  return <Screen><Title>Help with Pip</Title>{!film&&<PipAssistant prompt="What would you like a hand with?"/>}
    <Button secondary title="How it works" icon="help" onPress={()=>router.push('/how-it-works')}/>
    <Button title="Watch our welcome film" icon="play" onPress={replay}/>
    <View testID="help-grid" style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{helpFilms.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Watch ${item.title}`} onPress={()=>setFilm(item)} style={({pressed})=>({width:'47%',flexGrow:1,minWidth:120,padding:18,borderRadius:26,backgroundColor:item.color,gap:14,alignItems:'center',opacity:pressed?.8:1})}><View style={{width:68,height:68,borderRadius:34,backgroundColor:C.paper,alignItems:'center',justifyContent:'center'}}><Icon name={item.icon} size={34}/></View><Heading>{item.title}</Heading><Label small>{item.id==='about'?'Why we are here':'Watch with Pip'}</Label></Pressable>)}</View>
    <Modal visible={!!film} animationType="none" presentationStyle="fullScreen" onRequestClose={()=>setFilm(null)}>{film&&<AnimatedHelp film={film} onClose={()=>setFilm(null)}/>}</Modal>
  </Screen>;
}
