import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { InlinePipChat } from './InlinePipChat';
import { useApp } from './state';

// One control owns both Pip and recording; pages never add a second microphone.
export function PipAssistant({prompt,petId,initialMessage}:{prompt?:string;petId?:string;initialMessage?:string}){
  const app=useApp();
  const select=app.select;
  useFocusEffect(useCallback(()=>{if(petId)select(petId);},[petId,select]));
  return <View style={{width:'100%',maxWidth:560,alignSelf:'center'}}><InlinePipChat key={`${app.account?.id||'guest'}-${app.selected?.id||'welcome'}-${initialMessage||''}`} compact voiceFirst welcome={prompt} initialMessage={initialMessage}/></View>;
}
