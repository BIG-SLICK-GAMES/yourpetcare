import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useApp } from './state';
import { TalkingPip } from './Pip';
import { Avatar, Button, C, ErrorText, Heading, Label } from './ui';
import type { Proposal } from './types';

type Step='hello'|'care'|'services'|'outings'|'name'|'species'|'goal'|'username'|'password'|'review'|'confirm'|'done';
const previous:Partial<Record<Step,Step>>={care:'hello',services:'care',outings:'services',name:'outings',species:'name',goal:'species',username:'goal',password:'username',review:'goal',confirm:'review'};
export function PipOnboarding({onStart,onExplore,onTry}:{onStart:()=>void;onExplore:()=>void;onTry:(message:string)=>void}){
  const app=useApp();
  const [step,setStep]=useState<Step>('hello'),[name,setName]=useState(''),[species,setSpecies]=useState(''),[goal,setGoal]=useState('');
  const [more,setMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[proposal,setProposal]=useState<Proposal|null>(null),[owner,setOwner]=useState(''),[receipt,setReceipt]=useState('');
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[signup,setSignup]=useState(true),[showPassword,setShowPassword]=useState(false);
  const working=useRef(false);
  const petName=name.trim();
  function next(value:Step){onStart();setError('');setStep(value);}
  async function review(){
    if(!app.account){next('username');return;}
    if(working.current)return;working.current=true;setBusy(true);setError('');
    try{const result=await app.propose({action:'add_pet',data:{name:petName,species,age:'',social:'unknown',training:'unknown',goals:goal},...(proposal&&owner===app.account.id&&Date.parse(proposal.expiresAt)>Date.now()?{replaceId:proposal.id}:{})});setProposal(result);setOwner(app.account.id);next('confirm');}
    catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  function checkUsername(){if(!/^[a-z0-9_.-]{3,40}$/i.test(username.trim())){setError('Use 3 to 40 letters or numbers. Leave out spaces.');return;}next('password');}
  async function authenticate(){
    if(working.current)return;
    if(password.length<12||password.length>200){setError('Your password needs 12 to 200 characters. A few words together can help.');return;}
    working.current=true;setBusy(true);setError('');
    try{await app.authenticate(username.trim(),password,signup);setPassword('');setShowPassword(false);next('review');}
    catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  async function confirm(){
    if(!proposal||working.current)return;
    if(!app.account||owner!==app.account.id){setError('Let’s check this with the account you’re using now.');setStep('review');return;}
    working.current=true;setBusy(true);setError('');
    try{const result=await app.decide(proposal.id,'confirm');if(result.status!=='confirmed')throw new Error('That did not save. Let’s check and try again.');setReceipt(result.report||`${petName} is saved in My pets.`);setStep('done');}
    catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  const title:Record<Step,string>={hello:'Hi! I’m Pip.',care:'A little help, every day.',services:'Need an extra hand?',outings:'And time for some fun!',name:'Who’s your pet?',species:`What kind of pet is ${petName}?`,goal:'What shall we do first?',username:signup?'Choose a sign-in name.':'What is your sign-in name?',password:signup?'Now choose a password.':'What’s your password?',review:`Let’s keep ${petName} here.`,confirm:'Did I get this right?',done:`${petName} is part of our team!`};
  title.username=signup?'Choose a sign-in name.':'What’s your sign-in name?';
  const text:Record<Step,string>={hello:'I’m here for you and your pet. I’ll show you what we can do together.',care:'I can help with meals, reminders and plans. You say yes before I save a change.',services:'Our map lists vets, groomers, trainers, pet shops and boarding. You contact the place to book.',outings:'We can look for parks and pet-friendly cafes, too. Always check with the place before you go.',name:'Tell me their name.',species:'Tap a picture.',goal:'Pick one. We can do more later.',username:signup?'This is the name you’ll use to come back. Use letters and numbers, with no spaces.':'We’ll keep your pet’s details here while you sign in.',password:signup?'Use at least 12 characters. A few words together are easier to remember.':'Type the password for your account.',review:app.account?'Ready? Let’s check their details.':'An account keeps your pet’s details safe for next time.',confirm:'Tap Save if this looks right. We can learn more about them later.',done:'All saved in My pets. What a lovely start. Let’s try a little chat together.'};
  const input=(label:string,value:string,change:(value:string)=>void,placeholder:string,submit:()=>void,secure=false)=><TextInput accessibilityLabel={label} value={value} onChangeText={change} placeholder={placeholder} placeholderTextColor={C.muted} secureTextEntry={secure} editable={!busy} autoCapitalize={step==='username'||step==='password'?'none':'words'} autoCorrect={step!=='username'&&step!=='password'} autoComplete={step==='password'?(signup?'new-password':'current-password'):step==='username'?'username':'off'} style={styles.answer} returnKeyType="next" onSubmitEditing={submit}/>;
  return <View style={styles.flow}>
    <TalkingPip size={180} words={`${title[step]} ${text[step]}`} onError={setError}/>
    <View style={styles.speech} accessibilityLiveRegion="polite"><View style={styles.tail}/><Heading>{title[step]}</Heading><Label style={styles.words}>{text[step]}</Label></View>
    {step==='hello'&&<Button title="Show me" onPress={()=>next('care')}/>}
    {step==='care'&&<Button title="What else?" onPress={()=>next('services')}/>}
    {step==='services'&&<Button title="And fun things?" onPress={()=>next('outings')}/>}
    {step==='outings'&&<Button title="Let’s add my pet" onPress={()=>next('name')}/>}
    {step==='name'&&<>{input('Your pet’s name',name,value=>setName(value.slice(0,80)),'Pet’s name',()=>{if(petName)next('species');})}<Button title="Next" disabled={!petName} onPress={()=>next('species')}/></>}
    {step==='species'&&<><View style={styles.animals}>{(more?app.catalog.species:app.catalog.species.slice(0,6)).map(animal=><Pressable key={animal} accessibilityRole="button" accessibilityLabel={animal} onPress={()=>{setSpecies(animal);next('goal');}} style={styles.animal}><Avatar species={animal} size={58}/><Label small>{animal}</Label></Pressable>)}</View><Button secondary title={more?'Fewer pets':'More pets'} onPress={()=>setMore(!more)}/></>}
    {step==='goal'&&<View style={{gap:10}}>{[['Meals & reminders','food'],[species==='Dog'?'Walks & fun':'Play together','play'],['Everyday care','heart']].map(([label,icon])=><Button key={label} secondary title={label} icon={icon as 'food'|'play'|'heart'} onPress={()=>{setGoal(label);next('review');}}/>)}</View>}
    {step==='review'&&<><Button title={app.account?'Check my pet':'Keep my pet here'} busy={busy} onPress={()=>void review()}/><Button secondary title="Change my answers" disabled={busy} onPress={()=>next('name')}/></>}
    {step==='username'&&<>{input('Username',username,setUsername,'Sign-in name',checkUsername)}<Button title="Next" disabled={!username.trim()} onPress={checkUsername}/><Button secondary title={signup?'I already have an account':'Make a new account'} onPress={()=>{setSignup(!signup);setError('');}}/></>}
    {step==='password'&&<><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} placeholder={signup?'At least 12 characters':'Password'} placeholderTextColor={C.muted} secureTextEntry={!showPassword} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete={signup?'new-password':'current-password'} style={styles.answer} returnKeyType="done" onSubmitEditing={()=>void authenticate()}/><Pressable accessibilityRole="button" accessibilityLabel={showPassword?'Hide password':'Show password'} onPress={()=>setShowPassword(!showPassword)} style={styles.smallButton}><Label small>{showPassword?'Hide password':'Show password'}</Label></Pressable><Button title={signup?'Make my account':'Sign in'} busy={busy} disabled={!password} onPress={()=>void authenticate()}/></>}
    {step==='confirm'&&proposal&&<><View style={styles.reply}>{proposal.details.filter(([,value])=>value&&!['unknown','not recorded','not decided'].includes(value.toLowerCase())).map(([label,value])=><Label key={label} style={styles.words}>{value}</Label>)}</View><Button title={`Save ${petName}`} icon="check" busy={busy} onPress={()=>void confirm()}/><Button secondary title="Change something" disabled={busy} onPress={()=>next('name')}/>{!!error&&<Button secondary title="Check again" disabled={busy} onPress={()=>void review()}/>}</>}
    {step==='done'&&<><View style={styles.reply}><Label>{receipt}</Label></View><Button title={goal.startsWith('Meals')?'Help with meal times':'Let’s chat'} icon="chat" onPress={()=>onTry(goal.startsWith('Meals')?`Help me set up meal reminders for ${petName}. Please ask me one question at a time.`:`I’ve just introduced ${petName}. Help us with ${goal.toLowerCase()}. Lead me with one useful question.`)}/><Button secondary title="Go to my home" onPress={onExplore}/></>}
    <ErrorText message={error}/>
    <View style={styles.footer}>{previous[step]&&<Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={busy} onPress={()=>next(previous[step]!)} style={styles.smallButton}><Label small muted>Back</Label></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Explore for now" disabled={busy} onPress={onExplore} style={styles.smallButton}><Label small muted>{step==='done'?'Explore with Pip':'Do this later'}</Label></Pressable></View>
  </View>;
}
const styles=StyleSheet.create({flow:{width:'100%',maxWidth:440,alignSelf:'center',gap:18,paddingVertical:20},character:{alignSelf:'center',alignItems:'center',gap:4},speech:{backgroundColor:'white',borderWidth:1,borderColor:C.line,borderRadius:28,padding:24,gap:10},tail:{position:'absolute',top:-7,left:'48%',width:14,height:14,backgroundColor:'white',borderLeftWidth:1,borderTopWidth:1,borderColor:C.line,transform:[{rotate:'45deg'}]},words:{fontSize:18,lineHeight:27},answer:{fontFamily:'Manrope',fontSize:20,color:C.ink,borderWidth:1,borderColor:C.line,borderRadius:22,backgroundColor:'white',padding:18,minHeight:62},animals:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:10},animal:{width:86,alignItems:'center',gap:7,paddingVertical:8},reply:{padding:22,gap:10,backgroundColor:C.sage,borderRadius:24,alignSelf:'flex-end',width:'92%'},smallButton:{minHeight:44,padding:12,alignItems:'center',justifyContent:'center'},footer:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:18}});
