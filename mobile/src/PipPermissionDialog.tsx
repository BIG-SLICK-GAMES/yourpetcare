import React from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, C, Heading, Icon, Label } from './ui';

export function PipPermissionDialog({mode,onAllow,onCancel}:{mode:'voice'|'text'|null;onAllow:()=>void;onCancel:()=>void}){
  const voice=mode==='voice';
  return <Modal visible={!!mode} transparent animationType="none" onRequestClose={onCancel}>
    <SafeAreaView style={{flex:1,backgroundColor:'rgba(20,45,39,.55)',alignItems:'center',justifyContent:'center',padding:16}}>
      <View testID="pip-permission-dialog" accessibilityViewIsModal style={{width:'100%',maxWidth:420,maxHeight:'95%',borderRadius:26,backgroundColor:C.paper,overflow:'hidden'}}>
        <View style={{padding:20,paddingBottom:12,flexDirection:'row',alignItems:'center',gap:12}}><Icon name={voice?'mic':'paw'} size={28}/><View style={{flex:1}}><Heading>{voice?'Let Pip hear you?':'Chat with Pip?'}</Heading></View></View>
        <ScrollView style={{flexShrink:1}} contentContainerStyle={{paddingHorizontal:20,paddingBottom:16,gap:12}}>
          <Label>{voice?'Pip will listen, reply aloud, then listen again until you end the conversation. Recordings and selected pet details are shared with OpenAI. Listening stops when you leave or switch apps. Your device may ask for microphone permission next.':'Your message and selected pet details will be shared with OpenAI so Pip can reply. Your microphone stays off.'}</Label>
        </ScrollView>
        <View style={{padding:16,paddingTop:4,gap:10}}>
          <Button title={voice?'Allow microphone':'Allow & continue'} icon={voice?'mic':'check'} onPress={onAllow}/>
          <Button secondary title="Not now" onPress={onCancel}/>
        </View>
      </View>
    </SafeAreaView>
  </Modal>;
}
