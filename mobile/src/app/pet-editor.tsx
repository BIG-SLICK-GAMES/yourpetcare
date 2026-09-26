import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { Avatar, Button, Card, Chip, ErrorText, Field, Heading, Label, Screen, Title, s } from '../ui';

export default function PetEditor() {
  const app=useApp(), params=useLocalSearchParams<{id?:string;replace?:string}>();
  const old=app.account?.pets.find(p=>p.id===params.id);
  const previous=params.replace?app.activeProposal:null;
  const data=(previous?.data||old) as any;
  const [name,setName]=useState(data?.name||''),[animal,setAnimal]=useState(data?.species||'Dog'),[breed,setBreed]=useState(data?.breed||''),[age,setAge]=useState(data?.age||''),[social,setSocial]=useState(data?.social||'unknown'),[training,setTraining]=useState(data?.training||'unknown'),[goals,setGoals]=useState(data?.goals||''),[careNotes,setCareNotes]=useState(data?.careNotes||'');
  const [step,setStep]=useState(old||previous?3:0),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function save() { if(!app.account){setError('Sign in to save. Your answers stay here while you do.');router.push('/account');return;}setError('');setBusy(true);try{await app.propose({action:old?'update_pet':'add_pet',petId:old?.id,data:{name,species:animal,breed,age,social,training,goals,careNotes},replaceId:params.replace});router.replace('/review');}catch(e){setError((e as Error).message);}finally{setBusy(false);} }
  return <Screen><View style={s.between}><Label small muted>{step+1} OF 4</Label><Avatar species={animal} size={70}/></View><Title>{['Who’s your companion?','Tell me a little more.','What feels good?','What would you love\nto do together?'][step]}</Title>
  {step===0&&<><Field label="Their name" value={name} onChange={setName} placeholder="Meet…"/><ScrollView horizontal contentContainerStyle={{gap:12}} showsHorizontalScrollIndicator={false}>{app.catalog.species.map(sp=><View key={sp} style={{alignItems:'center',gap:8,width:96}}><Avatar species={sp} size={65}/><Chip title={sp} active={sp===animal} onPress={()=>setAnimal(sp)}/></View>)}</ScrollView></>}
  {step===1&&<><Field label="Breed or kind (optional)" value={breed} onChange={setBreed} placeholder="A little more about them"/><Field label="Age (optional)" value={age} onChange={setAge} placeholder="e.g. 3 years"/></>}
  {step===2&&<><Heading>Around other animals</Heading><View style={s.wrap}>{[['unknown','Still learning'],['quiet','Quiet spaces'],['building','Building confidence'],['social','Happy with company']].map(([value,title])=><Chip key={value} title={title} active={social===value} onPress={()=>setSocial(value)}/>)}</View><Heading>Familiar skills</Heading><View style={s.wrap}>{[['unknown','Not sure yet'],['starting','Just starting'],['basics','The basics'],['comfortable','Everyday confidence'],['advanced','Advanced']].map(([value,title])=><Chip key={value} title={title} active={training===value} onPress={()=>setTraining(value)}/>)}</View></>}
  {step===3&&<><Field label="Together, we’d like to…" value={goals} onChange={setGoals} multiline placeholder="Quiet outings, learn something new, travel…"/><Field label="Care notes" value={careNotes} onChange={setCareNotes} multiline placeholder="Routines, favourites and care instructions"/><Card><Heading>{name||'Your companion'}</Heading><Label>{animal}{breed?` · ${breed}`:''}{age?` · ${age}`:''}</Label><Label small muted>You’ll review these details before saving.</Label></Card></>}
  <ErrorText message={error}/>{step<3?<Button title="Continue" disabled={step===0&&!name.trim()} onPress={()=>setStep(step+1)}/>:<Button title="Review my pet" busy={busy} onPress={()=>void save()}/>}<Button secondary title={step?'Back':'Back to my pets'} onPress={()=>step?setStep(step-1):router.back()}/></Screen>;
}
