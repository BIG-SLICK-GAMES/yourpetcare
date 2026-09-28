import React, { useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from './state';
import { TalkingPip } from './Pip';
import { BrandHeader } from './BrandLogo';
import { PipOnboardingArt } from './PipOnboardingArt';
import { PipPetWelcome } from './PipPetWelcome';
import { Avatar, Button, C, ErrorText, Heading, Label } from './ui';
import { RememberSignIn, useRememberSignIn } from './RememberSignIn';
import type { Proposal } from './types';

type Step='name'|'species'|'account'|'confirm'|'done';
export function PipOnboarding({onStart,onExplore,onTry}:{onStart:()=>void;onExplore:()=>void;onTry:(message:string)=>void}){
  const app=useApp();
  const [step,setStep]=useState<Step>('name'),[name,setName]=useState(''),[species,setSpecies]=useState('');
  const [page,setPage]=useState(0),[height,setHeight]=useState(640),[busy,setBusy]=useState(false),[error,setError]=useState(''),[proposal,setProposal]=useState<Proposal|null>(null),[owner,setOwner]=useState(''),[receipt,setReceipt]=useState('');
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[signup,setSignup]=useState(true),[showPassword,setShowPassword]=useState(false);
  const login=useRememberSignIn(setUsername,setSignup,app.account?.id);
  const working=useRef(false),petName=name.trim();
  function next(value:Step){Keyboard.dismiss();onStart();setError('');setStep(value);}
  async function authenticate(){
    if(working.current)return;
    if(!/^[a-z0-9_.-]{3,40}$/i.test(username.trim())){setError('Use 3 to 40 letters or numbers for your sign-in name. Leave out spaces.');return;}
    if(password.length<12||password.length>200){setError('Your password needs 12 to 200 characters. A few words together can help.');return;}
    working.current=true;setBusy(true);setError('');
    try{await app.authenticate(username.trim(),password,signup,login.remember);setPassword('');setShowPassword(false);next('confirm');}
    catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  async function save(){
    if(working.current)return;
    if(!app.account){next('account');return;}
    working.current=true;setBusy(true);setError('');
    try{
      const reusable=proposal&&owner===app.account.id&&proposal.data.name===petName&&proposal.data.species===species&&Date.parse(proposal.expiresAt)>Date.now();
      const pending=reusable?proposal:await app.propose({action:'add_pet',data:{name:petName,species,age:'',social:'unknown',training:'unknown',goals:''},...(proposal&&owner===app.account.id&&Date.parse(proposal.expiresAt)>Date.now()?{replaceId:proposal.id}:{})});
      setProposal(pending);setOwner(app.account.id);
      const result=await app.decide(pending.id,'confirm');
      if(result.status!=='confirmed')throw new Error('That did not save. Please try again.');
      setReceipt(result.report||`${petName} is saved in My pets.`);next('done');
    }catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  const titles:Record<Step,string>={name:'Hi! I’m Pip. Who’s your pet?',species:`What kind of pet is ${petName}?`,account:signup?'Keep your pet here.':'Welcome back.',confirm:`Hello, ${petName}!`,done:'You’re both home.'};
  const words:Record<Step,string>={name:'Just their name to start.',species:'Tap their picture.',account:signup?'Make an account, or sign in below.':'Sign in to save your pet.',confirm:'One tap to save. That’s all I need for now.',done:receipt};
  const tight=height<460,artWidth=tight?60:height<650?100:150;
  const animalPages=Math.max(1,Math.ceil(app.catalog.species.length/6));
  return <View testID="onboarding-frame" style={styles.flow} onLayout={event=>setHeight(event.nativeEvent.layout.height)}>
    {step==='name'&&!tight&&<View style={{gap:8}}><BrandHeader onSignIn={!app.account?()=>router.push('/account'):undefined}/><Label style={{fontWeight:'700'}}>Your Pet Care remembers the things you shouldn&apos;t have to.</Label></View>}
    <ScrollView testID="onboarding-body" keyboardShouldPersistTaps="handled" style={{flex:1,minHeight:0}} contentContainerStyle={{flexGrow:1,justifyContent:'center',gap:10,paddingVertical:6}}>
      <View style={styles.intro}>
        {!tight&&<TalkingPip illustration={step==='confirm'||step==='done'?<PipPetWelcome species={species} width={artWidth}/>:<PipOnboardingArt scene={step==='account'?'username':step==='name'?'hello':'species'} species={species} width={artWidth}/>} words={`${titles[step]} ${words[step]}`} onError={setError}/>}
        <View style={styles.speech} accessibilityLiveRegion="polite"><Heading>{titles[step]}</Heading>{!tight&&<Label>{words[step]}</Label>}</View>
      </View>
      {step==='name'&&<TextInput accessibilityLabel="Your pet’s name" value={name} onChangeText={value=>setName(value.slice(0,80))} placeholder="Pet’s name" placeholderTextColor={C.muted} autoCapitalize="words" autoComplete="off" style={styles.answer} returnKeyType="next" onSubmitEditing={()=>{if(petName)next('species');}}/>}
      {step==='species'&&<><View style={styles.animals}>{app.catalog.species.slice(page*6,page*6+6).map(animal=><Pressable key={animal} accessibilityRole="button" accessibilityLabel={animal} onPress={()=>{setSpecies(animal);next(app.account?'confirm':'account');}} style={styles.animal}><Avatar species={animal} size={44}/><Label small style={{textAlign:'center'}}>{animal}</Label></Pressable>)}</View>{animalPages>1&&<Button secondary title={page===animalPages-1?'Fewer pets':'More pets'} onPress={()=>setPage((page+1)%animalPages)}/>}</>}
      {step==='account'&&<><TextInput accessibilityLabel="Username" value={username} onChangeText={setUsername} placeholder="Sign-in name" placeholderTextColor={C.muted} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="username" style={styles.answer}/><View style={{flexDirection:'row',alignItems:'center',gap:4}}><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} placeholder={signup?'At least 12 characters':'Password'} placeholderTextColor={C.muted} secureTextEntry={!showPassword} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete={signup?'new-password':'current-password'} style={[styles.answer,{flex:1,minWidth:0}]} returnKeyType="done" onSubmitEditing={()=>void authenticate()}/><Pressable accessibilityRole="button" accessibilityLabel={showPassword?'Hide password':'Show password'} onPress={()=>setShowPassword(!showPassword)} style={styles.smallButton}><Label small>{showPassword?'Hide':'Show'}</Label></Pressable></View><RememberSignIn value={login.remember} onChange={login.setRemember}/>{login.saved&&<Pressable accessibilityRole="button" accessibilityLabel="Forget saved sign-in name" onPress={()=>void login.forget().catch(e=>setError((e as Error).message))} style={styles.smallButton}><Label small>Forget saved sign-in name</Label></Pressable>}</>}
      {step==='confirm'&&<View style={styles.reply}><Heading>{petName}</Heading><Label>{species}</Label></View>}
      <ErrorText message={error}/>
    </ScrollView>
    <View testID="onboarding-actions" style={styles.actions}>
      {step==='name'&&<Button title="Next" disabled={!petName} onPress={()=>next('species')}/>}
      {step==='account'&&<><Button title={signup?'Make my account':'Sign in'} busy={busy} disabled={!username.trim()||!password} onPress={()=>void authenticate()}/><Button secondary title={signup?'I already have an account':'Make a new account'} disabled={busy} onPress={()=>{setSignup(!signup);setError('');}}/></>}
      {step==='confirm'&&<><Button title={`Save ${petName}`} icon="check" busy={busy} onPress={()=>void save()}/><Button secondary title="Change details" disabled={busy} onPress={()=>next('name')}/></>}
      {step==='done'&&<><Button title="Go to my home" icon="home" onPress={onExplore}/><Button secondary title="Talk to Pip" icon="chat" onPress={()=>onTry(`I've just introduced ${petName}. Get to know us with one friendly question.`)}/></>}
      {step!=='done'&&<View style={styles.footer}>{step==='name'?<Pressable accessibilityRole="button" accessibilityLabel="See how Your Pet Care helps" onPress={()=>router.push('/how-it-works')} style={styles.smallButton}><Label small>How it works</Label></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={busy} onPress={()=>next(step==='species'?'name':'species')} style={styles.smallButton}><Label small>Back</Label></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Explore for now" disabled={busy} onPress={onExplore} style={styles.smallButton}><Label small>Do this later</Label></Pressable></View>}
    </View>
  </View>;
}
const styles=StyleSheet.create({
  flow:{flex:1,minHeight:0,width:'100%',maxWidth:440,alignSelf:'center',gap:8,paddingVertical:8},
  intro:{flexDirection:'row',alignItems:'center',gap:10},
  speech:{flex:1,minWidth:0,backgroundColor:'white',borderWidth:1,borderColor:C.line,borderRadius:22,padding:12,gap:6},
  answer:{fontFamily:'Manrope',fontSize:18,color:C.ink,borderWidth:1,borderColor:C.line,borderRadius:18,backgroundColor:'white',padding:12,minHeight:50},
  animals:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8},animal:{width:'30%',alignItems:'center',gap:4,paddingVertical:4,minHeight:70},
  reply:{padding:16,gap:6,backgroundColor:C.sage,borderRadius:22},
  actions:{flexShrink:0,gap:8,backgroundColor:C.paper},smallButton:{minHeight:44,padding:10,alignItems:'center',justifyContent:'center'},
  footer:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}
});
