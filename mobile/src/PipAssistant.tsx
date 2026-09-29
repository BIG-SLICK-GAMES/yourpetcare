import React from 'react';
import { View } from 'react-native';
import { InlinePipChat } from './InlinePipChat';
import { useApp } from './state';

// One control owns both Pip and recording; pages never add a second microphone.
export function PipAssistant({prompt}:{prompt?:string}){
  const app=useApp();
  return <View style={{width:'100%',maxWidth:560,alignSelf:'center'}}><InlinePipChat key={`${app.account?.id||'guest'}-${app.selected?.id||'welcome'}`} compact voiceFirst welcome={prompt}/></View>;
}
