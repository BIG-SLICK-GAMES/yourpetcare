import React from 'react';
import { Text, View } from 'react-native';
export function AttentionBadge({count}:{count:number}){
  if(!count)return null;
  return <View accessible={false} style={{minWidth:25,height:25,borderRadius:13,backgroundColor:'#b3261e',paddingHorizontal:6,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#faf8f1'}}><Text style={{color:'white',fontWeight:'800',fontSize:12}}>{count>99?'99+':count}</Text></View>;
}
