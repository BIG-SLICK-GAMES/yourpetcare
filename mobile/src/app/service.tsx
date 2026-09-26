import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { categoryIcon } from '../catalog';
import { Button, C, Card, ErrorText, Heading, Icon, Label, Screen, Title } from '../ui';
export default function Service() {
  const {id}=useLocalSearchParams<{id:string}>(),app=useApp();const p=app.catalog.providers.find(p=>p.id===id);const [error,setError]=useState('');
  if(!p)return <Screen><Title>Place not found</Title><Button title="Back to map" onPress={()=>router.replace('/map')}/></Screen>;
  async function open(url:string){try{if(!/^https?:\/\//.test(url))throw new Error('No website is recorded.');await Linking.openURL(url);}catch(e){setError((e as Error).message);}}
  async function save(){if(!app.account){router.push('/account');return;}if(!app.selected){router.push('/pet-editor');return;}try{await app.propose({action:'save_service',petId:app.selected.id,data:{providerId:p!.id}});router.push('/review');}catch(e){setError((e as Error).message);}}
  return <Screen><View style={{padding:20,borderRadius:40,backgroundColor:C.peach,alignSelf:'flex-start'}}><Icon name={categoryIcon(p.category)} size={40}/></View><Title>{p.name}</Title><Label>{p.address||'Address details not recorded'}</Label><Card><Heading>Before you go</Heading><Label>{p.pet_policy||'Ask the provider about access and suitability for your pet.'}</Label><Label small muted>Recorded animal coverage: {p.species_supported.join(', ')||'not supplied'}. Hours and availability are not live.</Label></Card><ErrorText message={error}/><Button title={app.account?.saved.includes(p.id)?'Saved service':'Review saving service'} icon="heart" onPress={()=>void save()}/><Button title="Directions" icon="map" secondary onPress={()=>void open(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`)}/>{!!p.website&&<Button secondary title="Visit website" onPress={()=>void open(p.website)}/>}<Button secondary title="Plan a visit" icon="calendar" onPress={()=>router.push({pathname:'/plan',params:{title:`Visit ${p.name}`}})}/>{!!p.source&&<Button secondary title="View listing source" onPress={()=>void open(p.source)}/>}<Label small muted>Contact the provider directly to make a booking.</Label></Screen>;
}
