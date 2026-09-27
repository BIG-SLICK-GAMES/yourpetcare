import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Pressable, View } from 'react-native';
import * as Speech from 'expo-speech';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { C, Label } from './ui';

export function TalkingPip({words,size=100,active=true,onError,onListen,illustration}:{words:string;size?:number;active?:boolean;onError?:(message:string)=>void;onListen?:()=>void;illustration?:React.ReactNode}){
  const request=useRef(0);
  useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state!=='active'){request.current++;void Speech.stop();}});return()=>sub.remove();},[]);
  useEffect(()=>()=>{request.current++;void Speech.stop();},[words,active]);
  async function hear(){
    onListen?.();
    const id=++request.current;
    try{await Speech.stop();if(id===request.current&&active)Speech.speak(words,{language:'en-AU',rate:.9,onError:()=>onError?.('Sound is unavailable. You can read Pip’s bubble.')});}
    catch{onError?.('Sound is unavailable. You can read Pip’s bubble.');}
  }
  return <Pressable testID="pip-talk" accessibilityRole="button" accessibilityLabel="Hear Pip" disabled={!active} onPress={()=>void hear()} style={{alignSelf:'center',maxWidth:'100%',alignItems:'center',gap:4}}>{illustration||<Pip size={size}/>}<Label small muted>Tap Pip to listen</Label></Pressable>;
}

// A little all-pets helper, drawn with the same shapes and colours as our pet art.
export function Pip({size=112}:{size?:number}) {
  const [wave]=useState(()=>new Animated.Value(0));
  useEffect(()=>{
    let alive=true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{
      if(!alive||reduced)return;
      Animated.sequence([0,1,0,1,0].map(toValue=>Animated.timing(wave,{toValue,duration:220,useNativeDriver:true,isInteraction:false}))).start();
    }).catch(()=>{});
    const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',()=>{wave.stopAnimation();wave.setValue(0);});
    return()=>{alive=false;wave.stopAnimation();subscription.remove();};
  },[wave]);
  return <View accessible accessibilityLabel="Pip, your friendly pet-care helper" accessibilityRole="image" style={{width:size,height:size}}>
    <Animated.View style={{transform:[{rotate:wave.interpolate({inputRange:[0,1],outputRange:['0deg','-7deg']})}]}}>
      <Svg width={size} height={size} viewBox="0 0 160 160" accessible={false}>
        <Circle cx="80" cy="80" r="76" fill={C.sage}/>
        <Ellipse cx="80" cy="137" rx="42" ry="7" fill="#c4d4be"/>
        <Path d="M47 107Q18 103 22 83Q25 76 31 84L43 93M114 87Q133 88 136 60Q139 48 146 54Q153 78 125 108" fill={C.gold} stroke={C.ink} strokeWidth="3" strokeLinecap="round"/>
        <Path d="M43 93Q34 49 61 41Q59 22 73 25Q78 26 80 37Q96 21 104 33Q108 39 99 45Q127 56 118 100L116 125Q107 141 95 129L65 129Q50 142 43 126Z" fill={C.gold} stroke={C.ink} strokeWidth="3" strokeLinejoin="round"/>
        <Ellipse cx="63" cy="77" rx="4" ry="6" fill={C.ink}/><Ellipse cx="98" cy="77" rx="4" ry="6" fill={C.ink}/>
        <Circle cx="53" cy="88" r="7" fill="#e9b8a0"/><Circle cx="108" cy="88" r="7" fill="#e9b8a0"/>
        <Path d="M71 88Q81 100 91 88" fill="none" stroke={C.ink} strokeWidth="3" strokeLinecap="round"/>
        <Path d="M47 106Q80 120 116 106L103 124L91 117Q69 118 47 106" fill={C.ink}/>
        <Path d="M78 108Q70 101 74 98Q77 95 80 99Q84 94 87 98Q91 102 78 108" fill={C.paper}/>
      </Svg>
    </Animated.View>
  </View>;
}
