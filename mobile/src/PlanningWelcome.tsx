import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { PipDrawing } from './Pip';
import { C, Icon } from './ui';

export function PlanningWelcome(){
  const [progress]=useState(()=>new Animated.Value(0));
  useEffect(()=>{
    let alive=true,animation:Animated.CompositeAnimation|undefined;
    const stop=()=>{animation?.stop();progress.setValue(0);};
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(!alive||reduced)return;animation=Animated.loop(Animated.sequence([Animated.timing(progress,{toValue:1,duration:1100,useNativeDriver:true,isInteraction:false}),Animated.timing(progress,{toValue:0,duration:1100,useNativeDriver:true,isInteraction:false})]),{iterations:3});animation.start();}).catch(()=>{});
    const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',stop),activity=AppState.addEventListener('change',state=>{if(state!=='active')stop();});
    return()=>{alive=false;stop();motion.remove();activity.remove();};
  },[progress]);
  return <View accessible accessibilityRole="image" accessibilityLabel="Pip planning adventures, meals and care on a calendar and map" style={{width:320,maxWidth:'100%',aspectRatio:4/3,alignSelf:'center'}}>
    <Svg width="100%" height="100%" viewBox="0 0 320 240" accessible={false}><Path d="M20 137C-1 67 84 25 151 48C237 11 319 94 295 162C290 220 199 231 139 210C51 239 16 197 20 137Z" fill={C.sage}/><Ellipse cx="160" cy="213" rx="127" ry="11" fill="#c4d4be"/>
      <G transform="translate(181 74) rotate(8)"><Rect width="104" height="122" rx="14" fill={C.paper} stroke={C.ink} strokeWidth="3"/><Path d="M0 31h104M24-7v19M80-7v19" stroke={C.ink} strokeWidth="4" strokeLinecap="round"/><Rect x="14" y="45" width="30" height="26" rx="7" fill={C.gold}/><Rect x="58" y="45" width="30" height="26" rx="7" fill={C.peach}/><Rect x="14" y="84" width="30" height="26" rx="7" fill={C.blue}/><Path d="m60 94 8 8 19-20" stroke={C.ink} strokeWidth="4" fill="none" strokeLinecap="round"/></G>
      <G transform="translate(33 64)"><PipDrawing pose="point"/></G><G transform="translate(21 152) rotate(-8)"><Path d="m0 0 25-8 26 8 25-8v48l-25 8-26-8-25 8Z" fill={C.paper} stroke={C.ink} strokeWidth="2"/><Path d="M25-8v48M51 0v48M6 23q15-28 33-3t30-8" stroke="#8da681" strokeWidth="2" fill="none"/><Circle cx="65" cy="13" r="4" fill={C.rust}/></G>
    </Svg>
    <Animated.View style={{position:'absolute',top:'3%',left:'15%',flexDirection:'row',gap:18,transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[0,-8]})}]}}>{(['plane','food','heart'] as const).map((icon,i)=><View key={icon} style={{width:45,height:45,borderRadius:23,backgroundColor:[C.blue,C.gold,C.peach][i],alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.paper}}><Icon name={icon} size={25}/></View>)}</Animated.View>
  </View>;
}
