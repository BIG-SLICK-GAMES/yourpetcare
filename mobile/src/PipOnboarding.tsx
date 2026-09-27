import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from './state';
import { Pip } from './Pip';
import { Avatar, Button, C, Chip, ErrorText, Field, Heading, Label, s } from './ui';
import type { Proposal } from './types';

type Step='name'|'species'|'age'|'social'|'goal'|'review'|'account'|'confirm'|'done';
const order:Step[]=['name','species','age','social','goal','review','confirm','done'];
export function PipOnboarding({onStart,onExplore,onTry}:{onStart:()=>void;onExplore:()=>void;onTry:(message:string)=>void}){
  const app=useApp();
  const [step,setStep]=useState<Step>('name'),[name,setName]=useState(''),[species,setSpecies]=useState(''),[age,setAge]=useState(''),[social,setSocial]=useState('unknown'),[goal,setGoal]=useState('');
  const [more,setMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[proposal,setProposal]=useState<Proposal|null>(null),[owner,setOwner]=useState(''),[receipt,setReceipt]=useState('');
  const working=useRef(false);
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[signup,setSignup]=useState(true);
  const petName=name.trim(),isDog=species==='Dog';
  function next(value:Step){onStart();setError('');setStep(value);}
  async function review(){
    if(!app.account){next('account');return;}
    if(working.current)return;working.current=true;setBusy(true);setError('');
    try{const result=await app.propose({action:'add_pet',data:{name:petName,species,age:age.trim(),social,training:'unknown',goals:goal},...(proposal&&owner===app.account.id&&Date.parse(proposal.expiresAt)>Date.now()?{replaceId:proposal.id}:{})});setProposal(result);setOwner(app.account.id);next('confirm');}
    catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  async function authenticate(){
    if(working.current)return;working.current=true;setBusy(true);setError('');
    try{await app.authenticate(username.trim(),password,signup);setPassword('');next('review');}
    catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  async function confirm(){
    if(!proposal||working.current)return;
    if(!app.account||owner!==app.account.id){setError('Please review the profile with your current account before saving.');setStep('review');return;}
    working.current=true;setBusy(true);setError('');
    try{const result=await app.decide(proposal.id,'confirm');if(result.status!=='confirmed')throw new Error('This profile has not been saved. Please review it again.');setReceipt(result.report||`${petName} is saved in My pets.`);setStep('done');}
    catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  const title={name:'Hey, I’m Pip. Who’s your little sidekick?',species:`${petName}! What kind of companion?`,age:`And how old is ${petName}?`,social:`What feels good for ${petName}?`,goal:'What could I take off your mind?',review:`I’m getting to know ${petName}.`,account:'Let’s keep our little team together.',confirm:'Does this sound like your companion?',done:`You, me and ${petName.length?petName:'your pet'}. A team.`}[step];
  const text={name:'I’ll help you get settled, one little question at a time. What’s your pet’s name?',species:'Fur, feathers, scales—or something else. Everyone belongs here.',age:'A rough idea is fine. We can fill in anything else as we go.',social:'Around other animals, are they happiest with a little space or some company?',goal:'Choose one little thing to start with. We’ll figure out the rest together.',review:app.account?'Let’s check their profile before I save anything.':'Let’s keep this little introduction. Sign in or make an account to save it; your answers stay here while you do.',account:`An account gives ${petName} a place to call home here. Your answers are still with me.`,confirm:'You’re in charge. Check these details, then give me the nod to save them.',done:'Let’s try one useful thing together. Tap a suggestion, then talk or type your reply. I’ll ask before saving any changes.'}[step];
  const choices=more?app.catalog.species:app.catalog.species.slice(0,6);
  return <View style={styles.flow}>
    <View style={styles.character}><Pip size={step==='name'?176:138}/>{species&&step!=='name'&&<View style={styles.pet}><Avatar species={species} size={52}/></View>}</View>
    <View style={styles.speech} accessibilityLiveRegion="polite"><View style={styles.tail}/><Heading>{title}</Heading><Label>{text}</Label></View>
    {step==='name'&&<><TextInput accessibilityLabel="Your pet’s name" placeholder="Their name…" placeholderTextColor={C.muted} value={name} onChangeText={value=>setName(value.slice(0,80))} style={styles.answer} returnKeyType="next" onSubmitEditing={()=>{if(petName)next('species');}}/><Button title={petName?`Meet ${petName}`:'Let’s meet your pet'} disabled={!petName} icon="paw" onPress={()=>next('species')}/></>}
    {step==='species'&&<><View style={styles.animals}>{choices.map(animal=><Pressable key={animal} accessibilityRole="button" accessibilityLabel={animal} onPress={()=>{setSpecies(animal);next('age');}} style={styles.animal}><Avatar species={animal} size={58}/><Label small>{animal}</Label></Pressable>)}</View><Button secondary title={more?'Show fewer companions':'More companions'} onPress={()=>setMore(!more)}/></>}
    {step==='age'&&<><TextInput accessibilityLabel="Pet age" value={age} onChangeText={value=>setAge(value.slice(0,60))} placeholder="About 3 years, a few months…" placeholderTextColor={C.muted} style={styles.answer} returnKeyType="next" onSubmitEditing={()=>next('social')}/><Button title="That’s my little one" onPress={()=>next('social')}/><Button secondary title="I’m not sure yet" onPress={()=>{setAge('');next('social');}}/></>}
    {step==='social'&&<View style={{gap:10}}>{[['quiet','A little space'],['building','Building confidence'],['social','Loves company'],['unknown','Still getting to know them']].map(([value,label])=><Button key={value} secondary title={label} onPress={()=>{setSocial(value);next('goal');}}/>)}</View>}
    {step==='goal'&&<View style={{gap:10}}>{[['Meals & little reminders','food'],[isDog?'Walks & little adventures':'Play & time together','play'],['Everyday care','heart']].map(([label,icon])=><Button key={label} secondary title={label} icon={icon as 'food'|'play'|'heart'} onPress={()=>{setGoal(label);next('review');}}/>)}</View>}
    {step==='review'&&<><View style={styles.summary}><View style={s.row}><Avatar species={species} size={52}/><View style={{flex:1}}><Heading>{petName}</Heading><Label>{species}{age?` · ${age}`:''}</Label></View></View><Label>{goal}</Label><Label small muted>No profile has been saved yet.</Label></View><Button title={app.account?'Review profile':'Sign in to keep our progress'} busy={busy} onPress={()=>void review()}/><Button secondary title="Change an answer" disabled={busy} onPress={()=>next('name')}/></>}
    {step==='account'&&<><View style={s.wrap}><Chip title="Create account" active={signup} onPress={()=>setSignup(true)}/><Chip title="Sign in" active={!signup} onPress={()=>setSignup(false)}/></View><Field label="Username" value={username} onChange={setUsername} placeholder="Letters, numbers, dots or underscores"/><Field label="Password" value={password} onChange={setPassword} secure placeholder={signup?'At least 12 characters':'Your password'}/><Button title={signup?'Create our account':'Sign in & continue'} busy={busy} disabled={!username.trim()||!password} onPress={()=>void authenticate()}/><Button secondary title="Back to our introduction" disabled={busy} onPress={()=>next('review')}/></>}
    {step==='confirm'&&proposal&&<><View style={styles.summary}>{proposal.details.filter(([,value])=>value&&!['unknown','not recorded','not decided'].includes(value.toLowerCase())).map(([label,value])=><View key={label}><Label small muted>{label}</Label><Label>{label==='Comfort'?({quiet:'A little space',building:'Building confidence',social:'Loves company'}[value as 'quiet'|'building'|'social']||value):value}</Label></View>)}</View><Button title={`Confirm & save ${petName}`} icon="check" busy={busy} onPress={()=>void confirm()}/><Button secondary title="Change details" disabled={busy} onPress={()=>next('name')}/>{!!error&&<Button secondary title="Review again" disabled={busy} onPress={()=>void review()}/>}</>}
    {step==='done'&&<><View style={styles.summary}><Label>{receipt}</Label><Label small muted>Find their profile in My pets. No reminders have been created yet.</Label></View><Button title={goal.startsWith('Meals')?'Let’s sort meal reminders':'Let’s try our first chat'} icon="chat" onPress={()=>onTry(goal.startsWith('Meals')?`Help me set up meal reminders for ${petName}. Please ask me one question at a time.`:`I’ve just introduced ${petName}. Help us with ${goal.toLowerCase()}. Lead me with one useful question.`)}/><Label small muted>Use the microphone to talk. Turn sound on to hear my reply. You’ll choose whether to share your message with AI first.</Label><Button secondary title="See our pet profile" icon="paw" onPress={()=>{onExplore();router.push('/pets');}}/></>}
    <ErrorText message={error}/>
    <View style={styles.footer}>{order.indexOf(step)>0&&order.indexOf(step)<5&&<Chip title="Back" onPress={()=>next(order[order.indexOf(step)-1])}/>}<Pressable accessibilityRole="button" accessibilityLabel={step==='done'?'Explore with Pip':'Explore for now'} disabled={busy} onPress={onExplore} style={{padding:12}}><Label small muted>{step==='done'?'Explore with Pip':'Explore for now'}</Label></Pressable></View>
  </View>;
}
const styles=StyleSheet.create({flow:{width:'100%',maxWidth:480,alignSelf:'center',gap:14,paddingVertical:12},character:{alignSelf:'center'},pet:{position:'absolute',right:-18,bottom:5,borderWidth:4,borderColor:C.paper,borderRadius:32},speech:{backgroundColor:'white',borderWidth:1,borderColor:C.line,borderRadius:26,padding:22,gap:10},tail:{position:'absolute',top:-7,left:'48%',width:14,height:14,backgroundColor:'white',borderLeftWidth:1,borderTopWidth:1,borderColor:C.line,transform:[{rotate:'45deg'}]},answer:{fontFamily:'Manrope',fontSize:18,color:C.ink,borderWidth:1,borderColor:C.line,borderRadius:20,backgroundColor:'white',padding:18,minHeight:58},animals:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:12},animal:{width:86,alignItems:'center',gap:7,paddingVertical:8},summary:{padding:20,gap:12,backgroundColor:C.sage,borderRadius:22},footer:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12}});
