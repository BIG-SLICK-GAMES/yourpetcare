import { Pressable } from './FeedbackPressable';
import React, { useState } from 'react';
import { Linking, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApp } from './state';
import { Provider } from './types';
import { categoryIcon } from './catalog';
import { Button, C, ErrorText, Heading, Icon, Label } from './ui';

export function PlacePopup({place,onClose}:{place:Provider|undefined;onClose:()=>void}){
  return <Modal visible={!!place} transparent animationType="fade" onRequestClose={onClose}>
    <SafeAreaView style={{flex:1,backgroundColor:'rgba(20,45,39,.45)',justifyContent:'center',padding:16}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close place details" onPress={onClose} style={{position:'absolute',inset:0}}/>
      {place&&<PopupContent key={place.id} place={place} onClose={onClose}/>}
    </SafeAreaView>
  </Modal>;
}
function PopupContent({place:p,onClose}:{place:Provider;onClose:()=>void}){
  const app=useApp(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function open(url:string){setError('');try{const parsed=new URL(url);if(!['https:','http:','tel:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('This link is unavailable.');await Linking.openURL(url);}catch{setError('Could not open this link. Please try again.');}}
  async function favourite(preferred=false){
    if(!app.account){onClose();router.push('/account');return;}
    setBusy(true);setError('');
    try{await app.propose({action:preferred?'set_preferred_vet':'save_service',petId:app.selected?.id,data:{providerId:p.id}});onClose();router.push('/review');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const saved=app.account?.saved.includes(p.id),phone=p.phone?.replace(/[^+\d]/g,'');
  return <View testID="place-details-popup" accessibilityViewIsModal style={{width:'100%',maxWidth:500,maxHeight:'90%',alignSelf:'center',backgroundColor:C.paper,borderRadius:26,overflow:'hidden'}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingTop:14,paddingBottom:12,borderBottomWidth:1,borderBottomColor:C.line}}><Icon name={categoryIcon(p.category)} size={30}/><View style={{flex:1}}><Heading>{p.name}</Heading><Label small muted>{p.category.charAt(0).toUpperCase()+p.category.slice(1)}</Label></View><Pressable accessibilityRole="button" accessibilityLabel="Close popup" onPress={onClose} style={{padding:12,minWidth:44,minHeight:44}}><Icon name="close" size={22}/></Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:14}} style={{flexShrink:1}}>
      <Label>{p.address||'Address not recorded'}</Label>
      <ErrorText message={error}/>
      <Button title={saved?'In your favourites':'Add to favourites'} icon="heart" busy={busy} disabled={saved} onPress={()=>void favourite()}/>
      {!!p.website?<Button title="Visit website" icon="arrow" secondary onPress={()=>void open(p.website)}/>:<Label small muted>No website listed.</Label>}
      <Button title="Directions" icon="map" secondary onPress={()=>void open(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`)}/>
      {!!phone&&<Button secondary title={`Call ${p.phone}`} onPress={()=>void open(`tel:${phone}`)}/>}
      <Heading>Pet access</Heading><Label>{p.pet_policy||'Check access and suitability directly with the provider.'}</Label><Label small>Recorded animal coverage: {p.species_supported.join(', ')||'not supplied'}.</Label>
      {p.category==='vet'&&app.selected&&<Button secondary title={`Set as ${app.selected.name}'s vet`} busy={busy} onPress={()=>void favourite(true)}/>}
      {p.category==='shop'&&<Button secondary title="Shopping list for this store" icon="shop" onPress={()=>{onClose();router.push({pathname:'/shopping',params:{store:p.name}});}}/>}
      <Button secondary title="Plan a visit" icon="calendar" onPress={()=>{onClose();router.push({pathname:'/plan',params:{title:`Visit ${p.name}`,location:[p.name,p.address].filter(Boolean).join(', ')}});}}/>
      {!!p.source&&<Button secondary title="View listing source" onPress={()=>void open(p.source)}/>}
      <Label small muted>Opening hours and availability are not live. Contact the provider to check details or book.</Label>
    </ScrollView>
  </View>;
}
