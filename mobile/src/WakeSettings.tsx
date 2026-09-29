import React,{useState,useSyncExternalStore,useEffect} from 'react';
import { Modal,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button,Card,C,Heading,Label } from './ui';
import { setWakeEnabled,subscribeWake,wakeEnabled } from './wake-state';
import { wakeRecognition } from './wake-recognition';

export function WakeSettings(){
  const enabled=useSyncExternalStore(subscribeWake,wakeEnabled,()=>false);
  const [supported,setSupported]=useState(false),[permission,setPermission]=useState(false);
  useEffect(()=>{setSupported(!!wakeRecognition());},[]);
  return <Card><Heading>Hey Pip</Heading>
    <Label small>{supported?'Start a conversation by saying "Hey Pip" while the app is open.':'Wake phrases are unavailable in this browser or app build. You can still start a hands-free conversation using Pip.'}</Label>
    <Button secondary title={enabled?'Turn Hey Pip off':'Enable Hey Pip'} disabled={!supported} onPress={()=>{if(enabled)setWakeEnabled(false);else setPermission(true);}}/>
    <Modal visible={permission} transparent animationType="fade" onRequestClose={()=>setPermission(false)}><SafeAreaView style={{flex:1,justifyContent:'center',padding:20,backgroundColor:'rgba(20,45,39,.55)'}}><View style={{width:'100%',maxWidth:420,alignSelf:'center'}}><Card><Heading>Enable Hey Pip?</Heading><Label>Your browser listens for the wake phrase and may send audio to its speech service. Saying it starts a Pip conversation, sharing recordings and selected pet details with OpenAI.</Label><Label small>Stops when you switch apps, sign out or turn it off. It cannot wake a locked phone.</Label><Button title="Enable wake listening" icon="mic" onPress={()=>{setPermission(false);setWakeEnabled(true);}}/><Button secondary title="Not now" onPress={()=>setPermission(false)}/></Card></View></SafeAreaView></Modal>
  </Card>;
}
