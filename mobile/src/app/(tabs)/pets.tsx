import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../state';
import { Avatar, Button, Card, Heading, Label, Screen, Title, s } from '../../ui';
export default function Pets() {
  const app=useApp();
  return <Screen wide><Title>My pets</Title><View testID="pet-grid" style={{gap:20}}>{app.account?.pets.map(p=><Card key={p.id}><View style={s.row}><Avatar species={p.species}/><View style={{flex:1}}><Heading>{p.name}</Heading><Label muted>{p.breed||p.species}{p.age?` · ${p.age}`:''}</Label><Label small>{p.social==='quiet'?'Prefers quiet spaces':p.social==='building'?'Building confidence':p.social==='social'?'Comfortable around others':'Still getting to know them'}</Label></View></View>{!!p.mealRoutine&&<Label small>Meals: {new Date(p.mealRoutine.breakfastAt).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})} and {new Date(p.mealRoutine.dinnerAt).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})} ? every 24 hours</Label>}{!!p.careNotes&&<Label small>{p.careNotes}</Label>}{!!p.preferredVetId&&<Button secondary title={`Vet: ${app.catalog.providers.find(v=>v.id===p.preferredVetId)?.name||'View clinic'}`} onPress={()=>router.push({pathname:'/service',params:{id:p.preferredVetId!}})}/>}<View style={{gap:9}}><Button title={`Talk about ${p.name}`} onPress={()=>{app.select(p.id);router.navigate({pathname:'/',params:{mode:'chat'}});}}/><Button secondary title="Edit pet" onPress={()=>router.push({pathname:'/pet-editor',params:{id:p.id}})}/></View></Card>)}</View>{!app.account?.pets.length&&<Card><Avatar size={110}/><Heading>Add your first pet</Heading></Card>}<Button title="Add a pet" icon="plus" onPress={()=>router.push('/pet-editor')}/></Screen>;
}
