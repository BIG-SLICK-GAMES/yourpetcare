import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../state';
import { Avatar, Button, Card, Heading, Label, Screen, Title, s } from '../../ui';
export default function Pets() {
  const app=useApp();
  return <Screen><Title>Meet your crew</Title>{app.account?.pets.map(p=><Card key={p.id}><View style={s.row}><Avatar species={p.species}/><View style={{flex:1}}><Heading>{p.name}</Heading><Label muted>{p.breed||p.species}{p.age?` · ${p.age}`:''}</Label><Label small>{p.social==='quiet'?'Prefers quiet spaces':p.social==='building'?'Building confidence':p.social==='social'?'Comfortable around others':'Still getting to know them'}</Label></View></View><View style={{gap:9}}><Button title={`Talk about ${p.name}`} onPress={()=>{app.select(p.id);router.navigate('/');}}/><Button secondary title="Get to know them" onPress={()=>router.push({pathname:'/pet-editor',params:{id:p.id}})}/></View></Card>)}{!app.account?.pets.length&&<Card><Avatar size={110}/><Heading>Who makes your day?</Heading><Label>Dogs, horses, birds, reptiles and all the companions in between.</Label></Card>}<Button title="Meet a pet" icon="plus" onPress={()=>router.push('/pet-editor')}/><Label small muted>Photos and their admin approval flow will join this mobile build in a later stage. For now, each animal has an illustrated portrait.</Label></Screen>;
}
