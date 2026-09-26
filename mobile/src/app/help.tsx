import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Pip } from '../Pip';
import { useWelcomeIntro } from '../WelcomeIntro';
import { Button, C, Card, Field, Heading, Icon, type IconName, Label, Screen, Title, s } from '../ui';

const lessons:{title:string;icon:IconName;color:string;steps:string[];action:string;href:Href}[]=[
  {title:'Talk to Pip',icon:'chat',color:C.sage,steps:["Type a message or use your voice: tap the microphone on Companion. A conversation starter can get us going.","Sign in to keep our conversations, then choose whether to share your message with AI. Microphone access is optional.","Tap the sound button for spoken replies. Tell me what you need, one thing at a time."],action:'Open Companion',href:'/'},
  {title:'Get to know your pet',icon:'paw',color:C.gold,steps:["Open My pets and add your companion. Dogs, cats, birds, horses, reptiles and more are welcome.","Tell me their age, personality, routines and favourite things. Try: ‘Stormy is shy around other dogs.’","Review the details I suggest and tap Confirm to save them. Pick the right pet before chatting about their care."],action:'Open My pets',href:'/pets'},
  {title:'Meals & reminders',icon:'food',color:C.peach,steps:["Try asking: ‘Help me remember breakfast and dinner.’ Tell me the times that suit you.","Check the proposed times and tap Confirm. I’ll tell you what was saved, and your plans appear in Calendar.","Enable reminders in Calendar on your phone and allow notifications. The browser preview shows plans but cannot send device reminders."],action:'Open Calendar',href:'/calendar'},
  {title:'Plan a walk',icon:'map',color:C.blue,steps:["Open Map, choose Walking routes and tell me how long you have.","Pick a rest, cafe or dog-park stop—or just a walk. Choose your starting point on the map or tap Start at my location.","Pick a route, check the walking and break time, then add it to your calendar if you like. Bring water, a lead and poo bags for your dog."],action:'Open walking map',href:{pathname:'/map',params:{mode:'walk'}}},
  {title:'Vets & saved places',icon:'heart',color:C.lavender,steps:["Search the map or browse categories for a service. Check the listing’s details and contact the provider to confirm availability.","Save a place to find it again under You. Tell me your pet’s preferred vet and confirm the profile update.","I can help you plan a vet visit and remember it. A calendar entry does not book an appointment with the clinic."],action:'Explore the map',href:'/map'},
  {title:'You stay in charge',icon:'check',color:C.sage,steps:["I suggest changes to your pet’s profile or calendar. You can Confirm, Change or Cancel before anything is saved.","After confirming, I’ll tell you what changed. You can check the result in My pets or Calendar.","Manage your account, export your data or delete your account under You. Privacy explains how AI and location work."],action:'Privacy & your data',href:'/privacy'},
  {title:'When something isn’t working',icon:'care',color:C.peach,steps:["For a connection problem, open You and tap Check connection. Browsing and these tutorials are available without signing in.","If the microphone is unavailable, type instead. For silent replies, turn sound on and check your device volume.","For missing reminders, check Calendar and your phone’s notification permissions. Pip is a planning helper; contact a vet for medical concerns."],action:'Open You',href:'/account'},
];

export default function Help(){
  const replay=useWelcomeIntro(),[query,setQuery]=useState(''),[open,setOpen]=useState<string|null>(null),[step,setStep]=useState(0);
  const visible=lessons.filter(l=>`${l.title} ${l.steps.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <Screen><View style={s.row}><Pip size={76}/><View style={{flex:1,gap:4}}><Title>A little help?</Title><Label>I’m Pip. Let’s take it one step at a time.</Label></View></View>
    <Card color={C.sage}><Heading>Meet your pet-care companion</Heading><Label small>A 10-second animated tour.</Label><Button title="Watch the animated tour" icon="play" onPress={replay}/></Card>
    <Field label="Find a tutorial" value={query} onChange={value=>{setQuery(value);setOpen(null);setStep(0);}} placeholder="Try meals, walks or voice"/>
    {visible.map(lesson=><View key={lesson.title} style={{borderWidth:1,borderColor:C.line,borderRadius:22,backgroundColor:'white',overflow:'hidden'}}>
      <Pressable accessibilityRole="button" accessibilityLabel={lesson.title} accessibilityState={{expanded:open===lesson.title}} onPress={()=>{setOpen(open===lesson.title?null:lesson.title);setStep(0);}} style={[s.row,{padding:16}]}><View style={{width:46,height:46,borderRadius:23,backgroundColor:lesson.color,alignItems:'center',justifyContent:'center'}}><Icon name={lesson.icon}/></View><View style={{flex:1}}><Heading>{lesson.title}</Heading><Label small muted>3 short steps</Label></View><Icon name={open===lesson.title?'close':'plus'} size={19}/></Pressable>
      {open===lesson.title&&<View style={{padding:18,paddingTop:0,gap:16}}><View accessibilityLiveRegion="polite" style={{padding:18,borderRadius:18,backgroundColor:C.paper,gap:8}}><Label small muted>Step {step+1} of 3 · Pip’s tip</Label><Label>{lesson.steps[step]}</Label></View><View style={s.row}>{step>0&&<View style={{flex:1}}><Button secondary title="Previous step" onPress={()=>setStep(n=>n-1)}/></View>}<View style={{flex:1}}>{step<2?<Button title="Next step" onPress={()=>setStep(n=>n+1)}/>:<Button title={lesson.action} onPress={()=>router.push(lesson.href)}/>}</View></View></View>}
    </View>)}
    {!visible.length&&<Card><Label>No tutorial found. Try “walks”, “reminders” or “pets”.</Label><Button secondary title="Show all tutorials" onPress={()=>setQuery('')}/></Card>}
    <Button secondary title="Back to Pip" icon="chat" onPress={()=>router.navigate('/')}/>
  </Screen>;
}
