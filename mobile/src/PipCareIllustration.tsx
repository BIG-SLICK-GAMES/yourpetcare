import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Pip } from './Pip';
import { Avatar, C, Icon, IconName, Label } from './ui';

type Helper={label:string;icon:IconName;color:string;species?:string};
export type PipScene='hello'|'care'|'services'|'outings'|'name'|'species'|'goal'|'username'|'password'|'review'|'confirm'|'done';
const pet:Helper={label:'My pets',icon:'paw',color:C.sage};
const meals:Helper={label:'Meals',icon:'food',color:C.gold};
const reminders:Helper={label:'Reminders',icon:'calendar',color:C.gold};
const health:Helper={label:'Healthy pets',icon:'heart',color:C.peach};
const care:Helper={label:'Extra care',icon:'care',color:C.peach};
const places:Helper={label:'Places',icon:'map',color:C.blue};
const parks:Helper={label:'Parks',icon:'tree',color:C.sage};
const play:Helper={label:'Play & train',icon:'play',color:C.lavender};
const together:Helper={label:'Together',icon:'heart',color:C.peach};
const you:Helper={label:'You',icon:'person',color:C.blue};
const choice:Helper={label:'Your choice',icon:'check',color:C.gold};
const overview=[pet,meals,reminders,health,care,places,parks,play];
const scenes:Record<PipScene,Helper[]>={
  hello:overview,care:overview,
  services:[{...health,label:'Vets'},{...care,label:'Grooming'},{...meals,label:'Pet shops'},{...pet,label:'Boarding'},{...play,label:'Training'}],
  outings:[parks,{...meals,label:'Cafes'},places,{...play,label:'Walk & play'}],
  name:[you,{...pet,label:'Your pet'},together],
  species:['Dog','Cat','Horse','Bird','Reptile','Rabbit'].map(species=>({...pet,label:species,species})),
  goal:[meals,{...play,label:'Play'},health],
  username:[you,{...pet,label:'Your pet'},together],
  password:[you,{...pet,label:'Your pet'},together],
  review:[{...pet,label:'Your pet'},choice,{...care,label:'Their care'}],
  confirm:[{...pet,label:'Your pet'},choice,{...reminders,label:'Next steps'}],
  done:[{...pet,label:'Pet saved'},together,reminders,{...play,label:'Let’s begin'}],
};
const positions:Record<number,number[][]>={
  3:[[50,12],[84,72],[16,72]],
  4:[[50,12],[86,50],[50,89],[14,50]],
  5:[[50,12],[86,39],[73,83],[27,83],[14,39]],
  6:[[50,12],[84,31],[84,69],[50,89],[16,69],[16,31]],
  8:[[50,12],[82,24],[88,53],[78,81],[50,91],[22,81],[12,53],[18,24]],
};

// The same colours and icons users will find around the app, with Pip at the centre.
export function PipCareIllustration({scene='care'}:{scene?:PipScene}){
  const helpers=scenes[scene],compact=!['hello','care','services','outings','species'].includes(scene);
  const pipSize=compact?96:124,iconSize=compact?42:48;
  return <View accessible accessibilityRole="image" accessibilityLabel={`Pip surrounded by ${helpers.map(item=>item.label).join(', ')} icons`} style={{width:compact?260:320,maxWidth:'100%',aspectRatio:1,alignSelf:'center'}}>
    <Svg width="100%" height="100%" viewBox="0 0 320 320" style={{position:'absolute'}} accessible={false}><Circle cx="160" cy="162" r="116" fill="none" stroke={C.line} strokeWidth="2" strokeDasharray="3 8"/><Circle cx="160" cy="160" r="77" fill="#f0eedd"/><Path d="M93 91v10m-5-5h10M224 184v12m-6-6h12" stroke="#d9b65b" strokeWidth="3" strokeLinecap="round"/></Svg>
    <View style={{position:'absolute',left:'50%',top:'50%',transform:[{translateX:-pipSize/2},{translateY:-pipSize/2}]}}><Pip size={pipSize}/></View>
    {helpers.map((item,i)=>{const [x,y]=positions[helpers.length][i];return <View key={item.label} style={{position:'absolute',left:`${x}%`,top:`${y}%`,width:70,alignItems:'center',gap:3,transform:[{translateX:-35},{translateY:-32}]}}><View style={{width:iconSize,height:iconSize,borderRadius:iconSize/2,backgroundColor:item.color,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.paper}}>{item.species?<Avatar species={item.species} size={iconSize-6}/>:<Icon name={item.icon} size={compact?24:27}/>}</View><Label small style={{fontSize:10,lineHeight:14,fontWeight:'800',textAlign:'center'}}>{item.label}</Label></View>;})}
  </View>;
}
