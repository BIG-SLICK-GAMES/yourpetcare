import React, { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { feedbackSnapshot, setFeedback, subscribeFeedback, successFeedback } from './feedback';
import { Button, Card, Chip, Heading, Label, s } from './ui';

export function FeedbackSettings(){
  const settings=useSyncExternalStore(subscribeFeedback,feedbackSnapshot,feedbackSnapshot);
  return <Card><Heading>Sound & touch</Heading><View style={s.wrap}><Chip title={`Tap vibration: ${settings.haptics?'on':'off'}`} active={settings.haptics} onPress={()=>void setFeedback({...settings,haptics:!settings.haptics})}/><Chip title={`Completion sound: ${settings.sound?'on':'off'}`} active={settings.sound} onPress={()=>void setFeedback({...settings,sound:!settings.sound})}/></View><Button secondary title="Try completion feedback" onPress={()=>{successFeedback();}}/><Label small muted>Saved on this device. Vibration depends on your device and browser.</Label></Card>;
}
