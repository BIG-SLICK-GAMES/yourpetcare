import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../state';
import { Avatar, Button, Card, Heading, Label, Screen, Title } from '../../ui';
export default function Pets() {
  const app=useApp();
  return <Screen wide><Title>My pets</Title><View testID="pet-grid" style={{gap:20}}>{app.account?.pets.map(p=><Card key={p.id}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${p.name}'s profile`} onPress={()=>router.push({pathname:'/pet-editor',params:{id:p.id}})} style={{alignItems:'center',gap:8,paddingVertical:8}}><Avatar species={p.species}/><Heading center>{p.name}</Heading><Label muted style={{textAlign:'center'}}>{p.breed||p.species}{p.age?` - ${p.age}`:''}</Label><Label small style={{textAlign:'center'}}>{p.social==='quiet'?'Prefers quiet spaces':p.social==='building'?'Building confidence':p.social==='social'?'Comfortable around others':'Still getting to know them'}</Label>
    </Pressable>
    {!!p.mealRoutine&&<Label small style={{textAlign:'center'}}>Meals: {new Date(p.mealRoutine.breakfastAt).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})} and {new Date(p.mealRoutine.dinnerAt).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})} - every 24 hours</Label>}
    {!!p.careNotes&&<Label small style={{textAlign:'center'}}>{p.careNotes}</Label>}
    {!!p.preferredVetId&&<Button secondary title={`Vet: ${app.catalog.providers.find(v=>v.id===p.preferredVetId)?.name||'View clinic'}`} onPress={()=>router.push({pathname:'/service',params:{id:p.preferredVetId!}})}/>}
    <Button title={`Talk about ${p.name}`} onPress={()=>{app.select(p.id);router.navigate({pathname:'/',params:{mode:'chat',draft:`Let's talk about ${p.name}.`}});}}/>
  </Card>)}</View>{!app.account?.pets.length&&<Card><View style={{alignItems:'center',gap:12}}><Avatar size={110}/><Heading center>Add your first pet</Heading></View></Card>}<Button title="Add a pet" icon="plus" onPress={()=>router.push('/pet-editor')}/></Screen>;
}
