import { PipPermissionDialog } from '../../PipPermissionDialog';
import { Pressable } from '../../FeedbackPressable';
import { APP_WIDTH } from '../../app-width';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import * as Speech from 'expo-speech';
import { Avatar, Button, C, Chip, ErrorText, Heading, Icon, Label, s } from '../../ui';
import { Pip } from '../../Pip';
import { PipOnboarding } from '../../PipOnboarding';
import { useApp } from '../../state';
import { useVoice } from '../../useVoice';
import type { Proposal } from '../../types';

const subscribeToHydration=()=>()=>{};

export default function Companion() {
  const app=useApp(),pet=app.selected;
  const params=useLocalSearchParams<{mode?:string;draft?:string;voice?:string}>(),path=usePathname();
  const hydrated=useSyncExternalStore(subscribeToHydration,()=>true,()=>false);
  const mode=hydrated?params.mode:undefined;
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [consentOwner,setConsentOwner]=useState(''),[permission,setPermission]=useState<'voice'|'text'|null>(null);
  const [sound,setSound]=useState(false),[speaking,setSpeaking]=useState(false),[pets,setPets]=useState(false);
  const [replaceId,setReplaceId]=useState<string>(),[note,setNote]=useState('');
  const [exploring,setExploring]=useState(false),[onboardingStarted,setOnboardingStarted]=useState(false);
  const onboarding=hydrated&&!app.loading&&path==='/'&&(mode==='setup'||(!exploring&&mode!=='chat'&&(!pet||onboardingStarted)));
  const {setOnboardingOpen}=app;
  useEffect(()=>{setOnboardingOpen(onboarding);return()=>setOnboardingOpen(false);},[onboarding,setOnboardingOpen]);
  useEffect(()=>{if(path==='/'&&pet&&!onboardingStarted&&!exploring&&mode!=='chat'&&mode!=='setup')router.replace('/home');},[path,pet,onboardingStarted,exploring,mode]);
  const input=useRef<TextInput>(null),scroll=useRef<ScrollView>(null),focused=useRef(true),pendingText=useRef('');
  useFocusEffect(useCallback(()=>{if(path==='/'&&typeof params.draft==='string'){setMessage(params.draft.slice(0,1500));router.setParams({draft:undefined});}},[path,params.draft]));
  const signedIn=!!app.account,aiAvailable=app.catalog.aiAvailable;
  useFocusEffect(useCallback(()=>{
    if(path!=='/'||params.voice!=='ask')return;
    router.setParams({voice:undefined});
    if(!signedIn){router.push('/account');return;}
    if(!aiAvailable){setError('Live conversation is unavailable right now. You can still explore care and make a plan.');return;}
    setPermission('voice');
  },[path,params.voice,signedIn,aiAvailable]));
  const speechEnabled=useRef(sound);
  useEffect(()=>{speechEnabled.current=sound;},[sound]);
  const messages=app.account?.messages[pet?.id||'_welcome']||[];
  const proposal=app.account?.proposals.find(p=>p.id===replaceId)||app.account?.proposals.filter(p=>p.status==='pending'&&(p.petId===pet?.id||(!pet&&p.action==='add_pet'))).at(-1);
  const consent=!!app.account&&consentOwner===app.account.id;

  async function speak(text:string) {
    await Speech.stop();if(!focused.current)return;setSpeaking(true);
    Speech.speak(text,{language:'en-AU',rate:.95,onDone:()=>setSpeaking(false),onStopped:()=>setSpeaking(false),onError:()=>{setSpeaking(false);setError('Audio playback is unavailable. You can read the reply below.');}});
  }
  async function send(text:string,allowed=consent,readAloud=sound) {
    if(!text.trim()||busy)return;
    if(!app.catalog.aiAvailable){setError('Live conversation is unavailable right now. You can still explore care and make a plan.');return;}
    if(!app.account){router.push('/account');return;}
    if(!allowed){pendingText.current=text;setPermission('text');return;}
    setBusy(true);setError('');setNote('');setMessage(text);
    try {const result=await app.chat(text,true,replaceId);setMessage('');if(result.proposal)setReplaceId(undefined);if(readAloud&&speechEnabled.current&&focused.current)await speak(result.reply);}
    catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  const voice=useVoice(async text=>{setMessage(text);await send(text,true,true);},setError);
  const cancelVoice=voice.cancel;
  useFocusEffect(useCallback(()=>{focused.current=true;return()=>{focused.current=false;void cancelVoice();void Speech.stop();};},[cancelVoice]));

  async function microphone() {
    setError('');
    if(voice.recording){await voice.finish();return;}
    if(!app.catalog.aiAvailable){setError('Live conversation is unavailable right now. You can still explore care and make a plan.');return;}
    if(!app.account){router.push('/account');return;}
    if(!consent){setPermission('voice');return;}
    await Speech.stop();setSpeaking(false);setSound(true);await voice.start();
  }
  async function allow() {
    if(!app.account)return;setConsentOwner(app.account.id);const mode=permission;setPermission(null);
    if(mode==='voice'){await Speech.stop();setSound(true);await voice.start();}else await send(pendingText.current,true);
  }
  async function decide(choice:Proposal,value:'confirm'|'cancel') {
    setBusy(true);setError('');
    try {const result=await app.decide(choice.id,value);setReplaceId(undefined);setNote('');if(result.report&&sound)await speak(result.report);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function change(choice:Proposal) {setReplaceId(choice.id);setMessage('');setNote('What would you like to change?');input.current?.focus();}
  const unavailable=busy||voice.working;
  const micLabel=voice.recording?'Finish speaking':voice.working?'Processing voice':busy?'Thinking':'Tap to talk';
  const microphoneButton=<Pressable accessibilityRole="button" accessibilityLabel={micLabel} disabled={unavailable} onPress={()=>void microphone()} style={({pressed})=>[styles.orb,voice.recording&&styles.recording,pressed&&{transform:[{scale:.97}]}]}>{unavailable?<ActivityIndicator size="large" color={C.ink}/>:<><View pointerEvents="none"><Pip size={106}/></View><View pointerEvents="none" style={{position:'absolute',bottom:0,right:0,width:40,height:40,borderRadius:20,backgroundColor:voice.recording?C.rust:C.ink,alignItems:'center',justifyContent:'center'}}><Icon name={voice.recording?'stop':'mic'} size={22} color="white"/></View></>}</Pressable>;

  if(app.loading)return <SafeAreaView style={s.screen}><ActivityIndicator color={C.ink}/></SafeAreaView>;
  return <SafeAreaView style={s.screen} edges={['top','left','right']}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}>
    <View style={[styles.header,onboarding&&{display:'none'}]}><Pressable accessibilityRole="button" accessibilityLabel={pet?'Choose pet':'My pets'} disabled={unavailable||voice.recording} onPress={()=>pet?setPets(!pets):router.push('/pets')} style={s.row}><Avatar species={pet?.species||'Dog'} size={42}/><Label style={{fontWeight:'800'}}>{pet?.name||'Your Pet Care'}{pet?' ▾':''}</Label></Pressable><View style={s.row}><Pressable accessibilityRole="button" accessibilityLabel="Help & tutorials" onPress={()=>router.push('/help')} style={styles.iconButton}><Icon name="help" size={23}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={speaking?'Stop speaking':sound?'Turn spoken replies off':'Turn spoken replies on'} onPress={()=>{void Speech.stop();setSpeaking(false);if(!speaking)setSound(!sound);}} style={styles.iconButton}><Icon name={speaking?'stop':'sound'} color={sound?C.ink:C.muted} size={23}/>{!sound&&<View style={styles.slash}/>}</Pressable></View></View>
    {pets&&<ScrollView horizontal style={{flexGrow:0}} contentContainerStyle={{paddingHorizontal:22,gap:8,paddingBottom:12}}>{app.account?.pets.map(p=><Chip key={p.id} title={p.name} active={p.id===pet?.id} onPress={()=>{app.select(p.id);setPets(false);setReplaceId(undefined);setMessage('');setNote('');void Speech.stop();}}/>)}</ScrollView>}
    {!onboarding&&<View testID="conversation-microphone" style={{alignItems:'center',gap:4,paddingVertical:6}}>{microphoneButton}<Label small muted>{micLabel}</Label>{voice.recording&&<Button secondary title="Discard recording" onPress={()=>void voice.cancel()}/>}</View>}
    <ScrollView ref={scroll} testID="conversation-window" style={{display:onboarding?'none':'flex'}} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.conversation} onContentSizeChange={()=>{if(messages.length&&!onboarding)scroll.current?.scrollToEnd({animated:true});}}>
      {onboarding?null:!messages.length?<View style={styles.welcome}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Pip size={40}/><View style={{flex:1}}><Heading center>{pet?`How is ${pet.name} today?`:'Right here when you need me.'}</Heading></View></View>{!pet&&<Button title="Meet my pet with Pip" icon="paw" onPress={()=>{setExploring(false);router.setParams({mode:undefined});}}/>}</View>:<>
        {messages.map((m,i)=><View key={`${messages.length}-${i}`} style={[styles.bubble,m.role==='user'?styles.user:styles.assistant]}>{m.role==='assistant'&&<View style={s.row}><Pip size={34}/><Label small muted>Pip</Label></View>}<Label style={m.role==='assistant'?{fontSize:20,lineHeight:29}:undefined}>{m.content}</Label>{m.savedShoppingListId&&<Button secondary title="Open shopping list" onPress={()=>router.push({pathname:'/shopping',params:{list:m.savedShoppingListId}})}/>} {m.navigation?.mode==='walk'&&<Button title="Open walking map" icon="map" onPress={()=>router.push({pathname:'/map',params:{mode:'walk',minutes:m.navigation?.minutes?.toString()||'',stop:m.navigation?.stop||''}})}/>}{m.role==='assistant'&&<Pressable accessibilityRole="button" accessibilityLabel="Hear reply" onPress={()=>void speak(m.content)} style={[styles.iconButton,{alignSelf:'flex-start'}]}><Icon name="sound" size={19}/></Pressable>}</View>)}
      </>}
      {!!note&&<Label style={{textAlign:'center'}}>{note}</Label>}
      {!onboarding&&proposal&&<View style={styles.choice}><View style={s.row}><Icon name={proposal.action==='add_pet'?'paw':proposal.action==='add_shopping_items'?'shop':'calendar'} size={24}/><Heading>{proposal.summary}</Heading></View>{proposal.details.filter(([key,value])=>!['Reminder','Training','Comfort'].includes(key)&&value&&value!=='Unknown'&&value!=='Not decided').map(([key,value])=><View key={key} style={s.between}><Label small muted>{key}</Label><Label small style={{flex:1,textAlign:'right'}}>{['When','Breakfast','Dinner'].includes(key)?new Date(value).toLocaleString('en-AU'):value}</Label></View>)}<Button title="Confirm" icon="check" busy={busy} disabled={!!replaceId||voice.recording||voice.working} onPress={()=>void decide(proposal,'confirm')}/><View style={s.row}><View style={{flex:1}}><Button secondary title="Change" disabled={unavailable||voice.recording} onPress={()=>change(proposal)}/></View><View style={{flex:1}}><Button secondary title="Cancel" disabled={unavailable||voice.recording} onPress={()=>void decide(proposal,'cancel')}/></View></View></View>}
      <ErrorText message={error}/>{!!app.notice&&<Label small>{app.notice}</Label>}
    </ScrollView>
    {!onboarding&&(exploring||!!pet||!!messages.length)&&<View style={styles.composer}>

      <View style={styles.inputRow}><TextInput ref={input} accessibilityLabel="Message your companion" value={message} onChangeText={setMessage} placeholder={replaceId?'What should change?':'Or type here…'} placeholderTextColor={C.muted} multiline maxLength={1500} editable={!unavailable&&!voice.recording} style={styles.input}/><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!message.trim()||unavailable||voice.recording} onPress={()=>void send(message)} style={[styles.send,(!message.trim()||unavailable)&&{opacity:.45}]}><Icon name="arrow" color="white" size={21}/></Pressable></View>
      {!app.catalog.aiAvailable&&<Pressable accessibilityRole="button" onPress={()=>void app.refresh()} style={{alignItems:'center',padding:4}}><Label small muted>AI connection pending · Refresh</Label></Pressable>}
    </View>}
    <Modal visible={onboarding} animationType="none" presentationStyle="fullScreen" onRequestClose={()=>{setOnboardingStarted(false);setExploring(true);router.setParams({mode:undefined});router.replace('/home');}}><SafeAreaView style={s.screen}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}><View style={{flex:1,minHeight:0,paddingHorizontal:22}}>{onboarding&&<PipOnboarding onStart={()=>{setOnboardingStarted(true);}} onExplore={()=>{setOnboardingStarted(false);setExploring(true);router.setParams({mode:undefined});router.replace('/home');}} onTry={text=>{setOnboardingStarted(false);setExploring(true);router.setParams({mode:'chat'});setMessage(text);}}/>}</View></KeyboardAvoidingView></SafeAreaView></Modal>
    <PipPermissionDialog mode={permission} onAllow={()=>void allow()} onCancel={()=>setPermission(null)}/>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles=StyleSheet.create({
  header:{width:'100%',maxWidth:APP_WIDTH.conversation,alignSelf:'center',paddingHorizontal:22,paddingTop:12,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  iconButton:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},slash:{position:'absolute',width:25,height:2,backgroundColor:C.muted,transform:[{rotate:'-45deg'}]},
  conversation:{flexGrow:1,width:'100%',maxWidth:APP_WIDTH.conversation,alignSelf:'center',padding:22,paddingTop:8,gap:16},welcome:{flex:1,justifyContent:'center',gap:8,minHeight:44},
  helloBubble:{width:'100%',padding:20,borderRadius:24,backgroundColor:'white',borderWidth:1,borderColor:C.line,gap:10},bubbleTail:{position:'absolute',top:-7,left:'48%',width:14,height:14,backgroundColor:'white',borderLeftWidth:1,borderTopWidth:1,borderColor:C.line,transform:[{rotate:'45deg'}]},
  halo:{padding:24,borderRadius:120,backgroundColor:'#e8eddf',borderWidth:12,borderColor:'#f1f2e8',marginTop:6},orb:{width:124,height:124,borderRadius:62,backgroundColor:C.sage,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line},recording:{backgroundColor:C.rust,borderColor:C.rust},
  bubble:{maxWidth:'95%',padding:17,borderRadius:23,gap:6},user:{backgroundColor:C.sage,alignSelf:'flex-end'},assistant:{alignSelf:'flex-start',paddingHorizontal:2},choice:{padding:20,backgroundColor:'white',borderRadius:24,borderWidth:1,borderColor:C.line,gap:13},
  composer:{width:'100%',maxWidth:APP_WIDTH.conversation,alignSelf:'center',paddingHorizontal:22,paddingTop:10,paddingBottom:14,gap:12},inputRow:{flexDirection:'row',alignItems:'flex-end',borderWidth:1,borderColor:C.line,borderRadius:25,backgroundColor:'white',padding:6,gap:8},input:{fontFamily:'Manrope',fontSize:16,color:C.ink,flex:1,minHeight:40,maxHeight:100,padding:10},send:{width:42,height:42,borderRadius:21,backgroundColor:C.ink,alignItems:'center',justifyContent:'center'},shade:{flex:1,backgroundColor:'#183b3480',justifyContent:'center',alignItems:'center',padding:24},permission:{width:'100%',maxWidth:420,backgroundColor:C.paper,padding:24,borderRadius:25,gap:18},
});
