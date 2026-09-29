import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { InlinePipChat } from './InlinePipChat';
import { useApp } from './state';
import { PipSectionScene } from './PipSectionArt';
import { SectionTopic, sectionIntroduction } from './section-topics';

// One control owns both Pip and recording; pages never add a second microphone.
export function PipAssistant({prompt,petId,initialMessage,scene='care',onTopicChoose,selectedTopic}:{prompt?:string;petId?:string;initialMessage?:string;scene?:PipSectionScene;onTopicChoose?:(topic:SectionTopic)=>void;selectedTopic?:string}){
  const app=useApp();
  const select=app.select;
  useFocusEffect(useCallback(()=>{if(petId)select(petId);},[petId,select]));
  return <View style={{width:'100%',maxWidth:560,alignSelf:'center'}}><InlinePipChat key={`${app.account?.id||'guest'}-${app.selected?.id||'welcome'}-${scene}-${initialMessage||''}`} compact voiceFirst welcome={scene==='care'?prompt:sectionIntroduction(scene,app.selected?.name)} initialMessage={initialMessage} scene={scene} onTopicChoose={onTopicChoose} selectedTopic={selectedTopic}/></View>;
}
