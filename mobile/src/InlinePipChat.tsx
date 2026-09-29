import { Pressable } from './FeedbackPressable';
import React, { useCallback, useRef, useState } from 'react';
import { Linking, ScrollView, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useApp } from './state';
import { useVoice } from './useVoice';
import { Pip } from './Pip';
import { PipSectionArt, PipSectionScene } from './PipSectionArt';
import { PipPermissionDialog } from './PipPermissionDialog';
import { SectionTopicRow } from './SectionTopicRow';
import { SectionTopic, sectionTopics } from './section-topics';
import { Button, C, Card, ErrorText, Heading, Icon, Label, s } from './ui';

export function InlinePipChat({onClose,initialMessage='',welcome,compact=false,voiceFirst=false,scene,onTopicChoose,selectedTopic,shoppingListId}:{onClose?:()=>void;initialMessage?:string;welcome?:string;compact?:boolean;voiceFirst?:boolean;scene?:PipSectionScene;onTopicChoose?:(topic:SectionTopic)=>void;selectedTopic?:string;shoppingListId?:string}){
  const app=useApp(),pet=app.selected;
  const [text,setText]=useState(initialMessage),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [consent,setConsent]=useState(false),[permission,setPermission]=useState<'text'|'voice'|null>(null);
  const [typing,setTyping]=useState(!!initialMessage);
  const pending=useRef(''),active=useRef(true),messagesView=useRef<ScrollView>(null);
  const threadKey=`${pet?.id||'_welcome'}${scene?`::${scene}`:''}${shoppingListId?`::${shoppingListId}`:''}`;
  const messages=app.account?.messages[threadKey]||[];
  const proposal=app.account?.proposals.filter(p=>p.status==='pending'&&(p.petId===pet?.id||(!pet&&p.action==='add_pet'))).at(-1);
  async function speak(words:string){try{await Speech.stop();if(active.current)Speech.speak(words,{language:'en-AU',rate:.95,onError:()=>setError('Sound is unavailable. You can read the reply here.')});}catch{setError('Sound is unavailable. You can read the reply here.');}}
  async function send(message:string,allowed=consent,readAloud=false){
    if(!message.trim()||busy)return;
    setError('');
    if(!app.account){router.push('/account');return;}
    if(!app.catalog.aiAvailable){setError('Pip is unavailable right now. Please try again shortly.');return;}
    if(!allowed){pending.current=message;setPermission('text');return;}
    setBusy(true);
    try{const response=await app.chat(message,true,undefined,scene,shoppingListId);if(active.current){setText('');if(readAloud)await speak(response.reply);}}
    catch(e){if(active.current)setError((e as Error).message);}finally{if(active.current)setBusy(false);}
  }
  const voice=useVoice(async transcript=>{setText(transcript);await send(transcript,true,true);},setError);
  const cancel=voice.cancel;
  useFocusEffect(useCallback(()=>{active.current=true;return()=>{active.current=false;void cancel();void Speech.stop();};},[cancel]));
  async function mic(){setError('');if(voice.recording){await voice.finish();return;}if(!app.account){router.push('/account');return;}if(!app.catalog.aiAvailable){setError('Pip is unavailable right now. Please try again shortly.');return;}if(!consent){setPermission('voice');return;}await Speech.stop();await voice.start();}
  async function allow(){const mode=permission;setPermission(null);setConsent(true);if(mode==='voice'){await Speech.stop();await voice.start();}else await send(pending.current,true);}
  const unavailable=busy||voice.working;
  const Container=voiceFirst?View:Card;
  return <Container><View testID="inline-pip-chat" style={{gap:14}}>
    {voiceFirst&&<View testID="pip-assistant" style={{alignItems:'center',gap:12,paddingVertical:12}}>
      <Pressable testID="pip-voice-control" accessibilityRole="button" accessibilityLabel={voice.recording?'Finish speaking to Pip':'Talk to Pip'} accessibilityHint="Starts voice chat after your permission. You can also choose Type instead." accessibilityState={{disabled:unavailable||!!permission,busy:unavailable}} disabled={unavailable||!!permission} onPress={()=>void mic()} style={({pressed})=>({width:scene?254:184,height:scene?206:184,borderRadius:110,backgroundColor:scene?'transparent':C.sage,borderWidth:3,borderColor:voice.recording?C.rust:scene?'transparent':C.line,alignItems:'center',justifyContent:'center',opacity:pressed?.8:1})}>
        <View pointerEvents="none">{scene?<PipSectionArt scene={scene} species={pet?.species} petName={pet?.name}/>:<Pip size={148}/>}</View>
        <View pointerEvents="none" style={{position:'absolute',bottom:0,right:6,width:54,height:54,borderRadius:27,backgroundColor:voice.recording?C.rust:C.ink,borderWidth:4,borderColor:C.paper,alignItems:'center',justifyContent:'center'}}><Icon name={voice.recording?'stop':'mic'} size={27} color="white"/></View>
      </Pressable>
      <Label style={{textAlign:'center'}}>{voice.recording?'Listening - tap Pip to finish':unavailable?'Pip is thinking...':welcome||(pet?`How can I help ${pet.name}?`:'How can I help you and your pets?')}</Label>
      {!voice.recording&&!unavailable&&<Label small muted>Tap Pip to talk</Label>}
    </View>}
    {voiceFirst&&scene&&<SectionTopicRow selectedTopic={selectedTopic} topics={sectionTopics(scene,pet?.name)} disabled={unavailable||voice.recording||!!permission} onChoose={topic=>{if(onTopicChoose){onTopicChoose(topic);return;}setText(topic.draft);setTyping(true);setError('');}}/>}
    {(!compact||onClose)&&<View style={s.row}><View style={{flex:1}}><Heading>{pet?`Pip & ${pet.name}`:'Chat with Pip'}</Heading></View>{onClose&&<Pressable accessibilityRole="button" accessibilityLabel="Close chat" onPress={onClose} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Icon name="close"/></Pressable>}</View>}
    {(!compact||!!messages.length)&&<ScrollView ref={messagesView} nestedScrollEnabled style={{maxHeight:240}} contentContainerStyle={{gap:12}} onContentSizeChange={()=>messagesView.current?.scrollToEnd({animated:false})}>
      {!messages.length&&!voiceFirst&&<Label>{welcome||(pet?`How is ${pet.name} today?`:'What can I help with today?')}</Label>}
      {messages.map((message,i)=><View key={i} style={{padding:12,borderRadius:16,backgroundColor:message.role==='user'?C.sage:C.paper,gap:6}}><Label small muted>{message.role==='user'?'You':'Pip'}</Label><Label>{message.content}</Label>
        {shoppingListId&&message.shoppingSuggestions?.map((item,index)=>{const saved=app.account?.shopping?.some(i=>i.listId===shoppingListId&&!i.done&&i.name.toLowerCase()===item.name.toLowerCase());return <View key={index} style={{gap:8,paddingTop:10}}><Heading>{item.name}</Heading><Label small>{item.reason}</Label><Button title={saved?'Added to list':`Add ${item.name} to list`} icon={saved?'check':'plus'} disabled={saved||busy} onPress={()=>{setBusy(true);setError('');void app.shopping({action:'add',listId:shoppingListId,name:item.name,store:''}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}/><Button secondary title={`Compare ${item.name} on Google Shopping`} icon="search" onPress={()=>void Linking.openURL(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.name)}`).catch(()=>setError('Could not open Google Shopping.'))}/></View>;})}
        {message.navigation?.mode==='walk'&&<Button secondary title="Open walking map" icon="map" onPress={()=>router.push({pathname:'/map',params:{mode:'walk',minutes:message.navigation?.minutes?.toString()||'',stop:message.navigation?.stop||''}})}/>}
        {message.role==='assistant'&&<Pressable accessibilityRole="button" accessibilityLabel="Hear Pip's reply" onPress={()=>void speak(message.content)} style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingHorizontal:8}}><Icon name="sound" size={21}/></Pressable>}
      </View>)}
    </ScrollView>}
    {proposal&&<View style={{gap:8,padding:12,borderRadius:16,backgroundColor:C.gold}}><Label>{proposal.summary}</Label><Button title="Review Pip's suggestion" onPress={()=>router.push({pathname:'/review',params:{id:proposal.id}})}/></View>}
    <ErrorText message={error}/>
    <PipPermissionDialog mode={permission} onAllow={()=>void allow()} onCancel={()=>setPermission(null)}/>
    {!permission&&<>
      {(!voiceFirst||typing)&&<View style={{flexDirection:'row',alignItems:'flex-end',gap:8}}><TextInput accessibilityLabel="Message Pip" value={text} onChangeText={setText} placeholder="Type to Pip..." placeholderTextColor={C.muted} multiline maxLength={1500} editable={!unavailable&&!voice.recording} style={[s.input,{flex:1,minHeight:48,maxHeight:120}]}/><Pressable accessibilityRole="button" accessibilityLabel="Send to Pip" disabled={!text.trim()||unavailable||voice.recording} onPress={()=>void send(text)} style={{width:48,height:48,borderRadius:24,backgroundColor:C.ink,alignItems:'center',justifyContent:'center',opacity:(!text.trim()||unavailable||voice.recording)? .45:1}}><Icon name="arrow" color="white"/></Pressable></View>}
      {voiceFirst?<Pressable accessibilityRole="button" accessibilityLabel={typing?'Hide typing':'Type instead'} onPress={()=>setTyping(value=>!value)} style={{alignSelf:'center',minHeight:44,paddingHorizontal:18,justifyContent:'center'}}><Label small>{typing?'Hide typing':'Type instead'}</Label></Pressable>:<Button title={voice.recording?'Finish speaking':unavailable?'Thinking...':'Talk to Pip'} icon={voice.recording?'stop':'mic'} busy={unavailable} onPress={()=>void mic()}/>}
      {voice.recording&&<Button secondary title="Discard recording" onPress={()=>void voice.cancel()}/>}
    </>}
  </View></Container>;
}
