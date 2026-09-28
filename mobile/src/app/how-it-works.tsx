import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state';
import { Button, Card, Heading, Icon, Label, Screen, Title, type IconName, s } from '../ui';
const steps:{title:string;text:string;icon:IconName}[]=[
  {title:'1. Meet your pet',text:'Start with their name and type. Let Pip learn the rest with you.',icon:'paw'},
  {title:'2. Bring their world together',text:'Keep care notes, routines, plans, favourite places and supplies stores close at hand.',icon:'heart'},
  {title:'3. See what is coming',text:'Your care schedule shows upcoming plans. Your companion can help you decide on a next step.',icon:'calendar'},
  {title:'4. Take one useful step',text:'Review a reminder, plan a visit or find care nearby. Contact the provider to book.',icon:'map'},
  {title:'5. Keep the story together',text:'Completed calendar events stay in your care log. Dedicated health and stock history are the next chapter.',icon:'check'}
];
export default function HowItWorks(){const app=useApp();return <Screen><Title>A little less to remember.</Title><Label>Your Pet Care joins the everyday pieces of pet care, with you in charge.</Label>{steps.map(step=><Card key={step.title}><View style={s.row}><Icon name={step.icon} size={32}/><View style={{flex:1}}><Heading>{step.title}</Heading></View></View><Label>{step.text}</Label></Card>)}<Card><Heading>Your companion today</Heading><Label>{app.catalog.aiAvailable?'Live conversation is connected. You choose when to share a message and pet details with OpenAI.':'Live conversation is currently unavailable. You can still plan, explore and try the example.'}</Label><Label small>Automatic health-history and stock notices are a preview of what comes next. Your companion does not diagnose or replace your vet.</Label></Card><Button title="See your companion in action" icon="play" onPress={()=>router.push('/companion-demo')}/><Button secondary title="Care Around You" icon="map" onPress={()=>router.push('/map')}/><Button secondary title="Privacy & your data" onPress={()=>router.push('/privacy')}/></Screen>;}
