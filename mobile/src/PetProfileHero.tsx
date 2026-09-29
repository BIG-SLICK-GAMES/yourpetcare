import React from 'react';
import {Text,View} from 'react-native';
import Svg,{Circle,Defs,LinearGradient,RadialGradient,Rect,Stop} from 'react-native-svg';
import {Avatar,C,Label} from './ui';
import {Pet} from './types';

export function PetProfileHero({pet}:{pet:Pet}){
 return <View testID="pet-profile-hero" style={{borderRadius:32,overflow:'hidden',backgroundColor:C.ink,minHeight:290,padding:26,alignItems:'center',justifyContent:'center',gap:12}}>
  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',inset:0}}><Svg width="100%" height="100%" viewBox="0 0 440 330" preserveAspectRatio="xMidYMid slice" accessible={false}><Defs><LinearGradient id="profile-dusk" x1="0" y1="0" x2="100%" y2="100%"><Stop offset="0" stopColor="#183d39"/><Stop offset=".6" stopColor="#426c58"/><Stop offset="1" stopColor="#9baf82"/></LinearGradient><RadialGradient id="profile-light"><Stop offset="0" stopColor="#fff9d8" stopOpacity=".55"/><Stop offset=".45" stopColor="#f0e4bb" stopOpacity=".2"/><Stop offset="1" stopColor="#fff9d8" stopOpacity="0"/></RadialGradient></Defs><Rect width="440" height="330" fill="url(#profile-dusk)"/>{[[35,35,76],[355,28,96],[410,130,65],[92,245,98],[324,245,84],[187,20,44],[390,326,65],[4,169,43]].map(([cx,cy,r],i)=><Circle key={i} cx={cx} cy={cy} r={r} fill="url(#profile-light)"/>)}<Circle cx="341" cy="83" r="23" fill="#f1ecd0" opacity=".09"/><Circle cx="48" cy="175" r="14" fill="#f1ecd0" opacity=".09"/></Svg></View>
  <View accessibilityRole="image" accessibilityLabel={`${pet.name}'s ${pet.species.toLowerCase()} portrait`} style={{padding:7,borderRadius:90,borderWidth:1,borderColor:'#ffffff60',backgroundColor:'#ffffff20'}}><View style={{padding:4,borderRadius:80,backgroundColor:C.paper}}><Avatar species={pet.species} size={116}/></View></View>
  <Text accessibilityRole="header" style={{fontFamily:'Manrope',fontSize:32,fontWeight:'800',lineHeight:40,textAlign:'center',color:C.paper}}>{pet.name}</Text>
  <Label small style={{textAlign:'center',color:'#f4f4e6'}}>{[pet.species,pet.breed,pet.age].filter(Boolean).join(' · ')}</Label>
 </View>;
}
