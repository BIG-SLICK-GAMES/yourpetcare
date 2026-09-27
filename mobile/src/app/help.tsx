import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { TalkingPip } from '../Pip';
import { AnimatedHelp, helpFilms, type HelpFilm } from '../AnimatedHelp';
import { useWelcomeIntro } from '../WelcomeIntro';
import { Button, C, Heading, Icon, Label, Screen, Title } from '../ui';

export default function Help(){
  const replay=useWelcomeIntro(),[film,setFilm]=useState<HelpFilm|null>(null);
  return <Screen><View style={{alignItems:'center',gap:12}}><TalkingPip size={128} words="Pick a little film and I’ll show you what to do. We can meet your pet, set reminders, plan a walk and more." active={!film}/><View style={{padding:20,backgroundColor:'white',borderRadius:24,gap:8}}><Title>Let me show you.</Title><Label>Pick a little film. I’ll show you what to do.</Label></View></View>
    <Button title="Watch our welcome film" icon="play" onPress={replay}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{helpFilms.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Watch ${item.title}`} onPress={()=>setFilm(item)} style={({pressed})=>({width:'47%',flexGrow:1,minWidth:120,padding:18,borderRadius:26,backgroundColor:item.color,gap:14,alignItems:'center',opacity:pressed?.8:1})}><View style={{width:68,height:68,borderRadius:34,backgroundColor:C.paper,alignItems:'center',justifyContent:'center'}}><Icon name={item.icon} size={34}/></View><Heading>{item.title}</Heading><Label small>Watch with Pip</Label></Pressable>)}</View>
    <Modal visible={!!film} animationType="none" presentationStyle="fullScreen" onRequestClose={()=>setFilm(null)}>{film&&<AnimatedHelp film={film} onClose={()=>setFilm(null)}/>}</Modal>
  </Screen>;
}
