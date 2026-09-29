import React from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Pressable} from './FeedbackPressable';
import {useApp} from './state';
import {Pet} from './types';
import {C,Heading,Icon,IconName,Label} from './ui';
import categories from './data/pet-settings.json';
export function PetProfileHub({pet,onEdit}:{pet:Pet;onEdit:()=>void}){
 const app=useApp();
 const entries=[...Object.entries(categories).map(([id,c])=>({id,title:c.title,icon:c.icon as IconName})),{id:'places',title:'All favourite places',icon:'map' as IconName},{id:'reminders',title:'Calendar & reminders',icon:'calendar' as IconName},{id:'memories',title:"Pip's notes",icon:'chat' as IconName}];
 function open(category:string){app.select(pet.id);router.push({pathname:'/pet-settings',params:{id:pet.id,category}});}
 return <View style={{width:'100%',gap:18}}>
  <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={onEdit} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Label small style={{fontWeight:'700'}}>Edit pet details</Label></Pressable>
  <Heading center>Care & favourites</Heading>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{entries.map((entry,i)=>{const count=entry.id==='places'?pet.favouritePlaceIds?.length:entry.id==='reminders'?app.account?.events.filter(e=>e.petId===pet.id&&e.status==='planned').length:entry.id==='memories'?pet.careNotes?1:0:Object.values(pet.careSettings?.[entry.id]||{}).filter(Boolean).length;return <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Open ${entry.title}`} onPress={()=>open(entry.id)} style={({pressed})=>({width:'48%',flexGrow:1,minHeight:126,alignItems:'center',justifyContent:'center',padding:14,gap:9,borderRadius:23,backgroundColor:pressed?C.sage:C.card,borderWidth:1,borderColor:C.line})}><View style={{width:46,height:46,borderRadius:23,backgroundColor:[C.sage,C.peach,C.blue,C.gold,C.lavender][i%5],alignItems:'center',justifyContent:'center'}}><Icon name={entry.icon} size={25}/></View><Label small style={{fontWeight:'700',textAlign:'center'}}>{entry.title}</Label>{!!count&&<Label small muted>{entry.id==='reminders'?`${count} planned`:entry.id==='places'?`${count} saved`:'Saved details'}</Label>}</Pressable>;})}</View>
 </View>;
}
