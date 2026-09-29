import { Pressable } from './FeedbackPressable';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { savedUsername, rememberUsername } from './api';
import { C, Icon, Label } from './ui';
export function useRememberSignIn(setUsername:React.Dispatch<React.SetStateAction<string>>,setSignup:React.Dispatch<React.SetStateAction<boolean>>,ownerId?:string){
 const [remember,setRemember]=useState(false),[saved,setSaved]=useState(false);
 useEffect(()=>{let active=true;void savedUsername().then(value=>{if(active&&value){setUsername(current=>current||value);setSignup(false);setRemember(true);setSaved(true);}});return()=>{active=false;};},[setUsername,setSignup,ownerId]);
 async function forget(){await rememberUsername(null);setSaved(false);setRemember(false);setUsername('');}
 return {remember,setRemember,saved,forget};
}
export function RememberSignIn({value,onChange}:{value:boolean;onChange:(value:boolean)=>void}){
 return <Pressable accessibilityRole="checkbox" aria-checked={value} accessibilityLabel="Remember me on this device" accessibilityState={{checked:value}} onPress={()=>onChange(!value)} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:44,paddingVertical:8}}><View style={{width:26,height:26,borderRadius:7,borderWidth:1,borderColor:C.ink,backgroundColor:value?C.sage:C.paper,alignItems:'center',justifyContent:'center'}}>{value&&<Icon name="check" size={20}/>}</View><Label small style={{flex:1}}>Remember me on this device</Label></Pressable>;
}
