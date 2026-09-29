import {PetProfileHero} from '../PetProfileHero';
import {PetProfileHub} from '../PetProfileHub';
import { Pressable } from '../FeedbackPressable';
import React, { useState } from 'react';
import { ActivityIndicator, View, ScrollView } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { Avatar, Button, C, Card, Chip, ErrorText, Field, Heading, Label, Screen, Title, s } from '../ui';

export default function PetEditor() {
  const app=useApp(),params=useLocalSearchParams<{id?:string;replace?:string}>();
  if(app.loading)return <Screen><ActivityIndicator color={C.ink}/></Screen>;
  if(!params.id&&!params.replace)return <Redirect href={{pathname:'/',params:{mode:'setup'}}}/>;
  if(params.id&&!app.account?.pets.some(p=>p.id===params.id))return <Screen><Title>Pet not found</Title><Button title="Back to my pets" onPress={()=>router.replace('/pets')}/></Screen>;
  return <PetDetails key={`${app.account?.id}-${params.id}-${params.replace}`}/>;
}
function PetDetails() {
  const app=useApp(), params=useLocalSearchParams<{id?:string;replace?:string}>();
  const old=app.account?.pets.find(p=>p.id===params.id);
  const previous=params.replace?app.account?.proposals.find(p=>p.id===params.replace&&['add_pet','update_pet'].includes(p.action)):null;
  const data=(previous?.data||old) as any;
  const [name,setName]=useState(data?.name||''),[animal,setAnimal]=useState(data?.species||'Dog'),[breed,setBreed]=useState(data?.breed||''),[age,setAge]=useState(data?.age||''),[social,setSocial]=useState(data?.social||'unknown'),[training,setTraining]=useState(data?.training||'unknown'),[goals,setGoals]=useState(data?.goals||''),[careNotes,setCareNotes]=useState(data?.careNotes||'');
  const [editing,setEditing]=useState(!!params.replace||!old);
  const [profileOptions,setProfileOptions]=useState(false),[details,setDetails]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function save() { if(!app.account){setError('Sign in to save. Your answers stay here while you do.');router.push('/account');return;}setError('');setBusy(true);try{await app.propose({action:old?'update_pet':'add_pet',petId:old?.id,data:{name,species:animal,breed,age,social,training,goals,careNotes},replaceId:params.replace});router.replace('/review');}catch(e){setError((e as Error).message);}finally{setBusy(false);} }
  async function remove(){if(!old)return;setError('');setBusy(true);try{await app.propose({action:'remove_pet',petId:old.id,data:{}});router.push('/review');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <Screen>{old&&!editing?<PetProfileHero pet={old}/>:<View style={{alignItems:'center',gap:12}}><Avatar species={animal} size={70}/><Title center>{old?old.name:'Your companion'}</Title></View>}
    {!editing&&old&&<Button title={`Talk about ${old.name}`} icon="mic" onPress={()=>{app.select(old.id);router.push({pathname:'/pet-chat',params:{voice:'ask'}});}}/>}

    {editing?<><Label style={{textAlign:'center'}}>Change just what you need. The rest can wait.</Label>
    <Field center label="Their name" value={name} onChange={setName} placeholder="Pet name"/>
    <ScrollView horizontal contentContainerStyle={{gap:12}} showsHorizontalScrollIndicator={false}>{app.catalog.species.map(sp=><View key={sp} style={{alignItems:'center',gap:8,width:96}}><Avatar species={sp} size={65}/><Chip title={sp} active={sp===animal} onPress={()=>setAnimal(sp)}/></View>)}</ScrollView>
    <Button secondary title={details?'Hide optional details':'A little more about them (optional)'} onPress={()=>setDetails(!details)}/>
    {details&&<><Field center label="Breed or kind (optional)" value={breed} onChange={setBreed}/><Field center label="Age (optional)" value={age} onChange={setAge}/>
    <Heading center>Around other animals</Heading><View style={[s.wrap,{justifyContent:'center'}]}>{[['unknown','Still learning'],['quiet','Quiet spaces'],['building','Building confidence'],['social','Happy with company']].map(([value,title])=><Chip key={value} title={title} active={social===value} onPress={()=>setSocial(value)}/>)}</View>
    <Heading center>Familiar skills</Heading><View style={[s.wrap,{justifyContent:'center'}]}>{[['unknown','Not sure yet'],['starting','Just starting'],['basics','The basics'],['comfortable','Everyday confidence'],['advanced','Advanced']].map(([value,title])=><Chip key={value} title={title} active={training===value} onPress={()=>setTraining(value)}/>)}</View>
    <Field center label="Things to enjoy together" value={goals} onChange={setGoals} multiline/><Field center label="Care notes" value={careNotes} onChange={setCareNotes} multiline/></>}
    <ErrorText message={error}/><Button title="Review my pet" busy={busy} disabled={!name.trim()} onPress={()=>void save()}/></>:old&&<PetProfileHub pet={old} onEdit={()=>{setName(old.name);setAnimal(old.species);setBreed(old.breed);setAge(old.age);setSocial(old.social);setTraining(old.training);setGoals(old.goals);setCareNotes(old.careNotes||'');setEditing(true);}}/>}
    {!editing&&<ErrorText message={error}/>}

    <Button secondary title="Back to my pets" disabled={busy} onPress={()=>router.replace('/pets')}/>
    {!!old&&<><Pressable accessibilityRole="button" accessibilityLabel="Profile options" accessibilityState={{expanded:profileOptions}} disabled={busy} onPress={()=>setProfileOptions(!profileOptions)} style={{alignSelf:'center',minHeight:44,padding:12}}><Label small>Profile options</Label></Pressable>{profileOptions&&<Card><Heading center>When things change</Heading><Label style={{textAlign:'center'}}>If you are saying goodbye, there is no rush. You can keep {old.name}&apos;s profile here for as long as you need.</Label><Label small style={{textAlign:'center'}}>If you choose to remove it, we will ask you to review first. Removing the profile also permanently deletes its care schedule and conversations.</Label><Pressable accessibilityRole="button" accessibilityLabel="Review removing this profile" disabled={busy} onPress={()=>void remove()} style={{alignSelf:'center',minHeight:44,padding:12}}><Label small>Review removing this profile</Label></Pressable></Card>}</>}
  </Screen>;
}
