import React,{useState} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {useApp} from './state';
import {CareTimeline} from './CareTimeline';
import {Button,Card,ErrorText,Heading,Label} from './ui';
export function CareDashboard({petId}:{petId?:string}){
 const app=useApp(),[error,setError]=useState('');const account=app.account;if(!account?.pets.length)return null;
 const pet=account.pets.find(p=>p.id===(petId||app.selected?.id));
 const events=account.events.filter(e=>e.status==='planned'&&(!petId||e.petId===petId)).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).slice(0,4);
 const insights=(account.insights||[]).filter(i=>!petId||i.petId===petId).slice(0,1);
 const gap=pet&&!pet.setupDismissed?(!account.events.some(e=>e.petId===pet.id)?'care':!pet.careSettings?.feeding?.food?'food':!pet.preferredVetId?'vet':null):null;
 return <View testID="care-dashboard" style={{gap:14}}><Heading>{petId?'Care at a glance':'Your household’s care'}</Heading><CareTimeline events={events} compact/>{!events.length&&<Card><Heading>Room for your first plan</Heading><Label>Tell Pip about an appointment or care task. It will appear here after you confirm.</Label><Button title="Tell Pip" onPress={()=>router.push('/pet-chat')}/></Card>}{insights.map(i=><Card key={i.id}><Heading>Pip noticed</Heading><Label>{account.pets.find(p=>p.id===i.petId)?.name}: {i.title}</Label><Button title="View supply" onPress={()=>{app.select(i.petId);router.push('/inventory');}}/></Card>)}<Button secondary title="Open care calendar" onPress={()=>router.push('/calendar')}/>{gap&&pet&&<Card><Heading>A little more for {pet.name}</Heading><Label>{gap==='care'?'One upcoming care item is a good place to start.':gap==='food'?'Knowing their usual food helps Pip plan ahead.':'Save their usual vet so it is easy to find later.'}</Label><Button title={gap==='care'?'Add one care item':gap==='food'?'Tell Pip about food':'Find their vet'} onPress={()=>{app.select(pet.id);router.push(gap==='care'?'/care-event':gap==='food'?{pathname:'/pet-chat',params:{draft:`Let me tell you what ${pet.name} eats.`}}:{pathname:'/map',params:{category:'vet'}});}}/><Button secondary title="Not now" onPress={()=>void app.propose({action:'dismiss_setup',petId:pet.id,data:{}}).then(p=>app.decide(p.id,'confirm')).catch(e=>setError(e.message))}/></Card>}<ErrorText message={error}/></View>;
}
