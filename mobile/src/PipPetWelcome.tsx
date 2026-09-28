import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';
import { PipDrawing } from './Pip';
import { C } from './ui';

function PetFace({species}:{species:string}){
  const cat=species==='Cat',rabbit=species==='Rabbit',horse=species==='Horse',bird=species==='Bird',reptile=species==='Reptile',fish=species==='Fish',frog=species==='Amphibian',bug=species==='Invertebrate',farm=species==='Farm animal';
  const coat=cat?'#d4a26c':horse?'#bc8a60':bird?'#f0d375':reptile||frog||bug?'#98b586':fish?'#e4ae68':rabbit?'#dcc4aa':'#e5d6b7';
  return <G stroke={C.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {fish?<Path d="m99 59 28-25v65l-28-19" fill={coat}/>:bird?<Path d="m61 27 2-23 11 15 11-18 1 28" fill={coat}/>:bug?<Path d="M56 34 44 5m28 26L92 9M85 70l27-13M86 85l26 11" fill="none"/>:reptile?<Path d="M102 101q34 23 24-23" fill="none" stroke={coat} strokeWidth="14"/>:rabbit?<><Ellipse cx="58" cy="23" rx="13" ry="36" fill={coat} transform="rotate(-15 58 23)"/><Ellipse cx="86" cy="20" rx="12" ry="37" fill={coat}/><Path d="M58 5v32m28-34v31" stroke="#d39e9c" strokeWidth="6"/></>:cat?<Path d="M39 40 33 8l29 17L89 8l9 36" fill={coat}/>:horse||farm?<><Path d="M51 34 44 6l22 19 23-20-3 37" fill={coat}/>{farm&&<Path d="M43 18 38 2m47 15 8-15" fill="none" stroke="#9c8770" strokeWidth="5"/>}</>:<><Ellipse cx="40" cy="38" rx="20" ry="28" fill={species==='Dog'?'#846950':coat}/><Circle cx="85" cy="29" r="18" fill={coat}/></>}
    <Ellipse cx="68" cy="87" rx="48" ry="42" fill={coat}/>
    <Path d={horse?'M85 35Q42 16 39 58L18 86Q11 110 44 110L83 85Z':reptile?'M99 53Q58 27 25 56L7 80q1 23 37 22l54-14Z':'M103 58Q90 26 57 33Q24 36 24 68L13 82Q11 103 45 105L91 96Q111 83 103 58Z'} fill={coat}/>
    {frog&&<><Circle cx="48" cy="35" r="16" fill={coat}/><Circle cx="82" cy="35" r="16" fill={coat}/></>}
    {species==='Dog'&&<Path d="M84 33Q114 25 110 68q-11 18-22-8Z" fill="#846950"/>}
    {bird&&<Path d="M27 64 5 78l22 12" fill="#d39c5f"/>}
    <Path d={frog?'M39 35q9-9 18 0m16 0q9-9 18 0':'M40 57q9-10 18 0'} fill="none" strokeWidth="3"/>
    {!bird&&!bug&&<Ellipse cx="21" cy="81" rx="7" ry="5" fill={cat?'#bd7d78':C.ink} stroke="none"/>}
    <Path d="M26 94q11 6 19-2" fill="none"/>
    <Circle cx="61" cy="78" r="9" fill="#e5a99a" stroke="none" opacity=".8"/>
    {cat&&<Path d="m58 85 20-5m-19 12 22 5" fill="none" strokeWidth="1.5"/>}
    {fish&&<Path d="m80 77 14 13-14 12" fill="#f5d699"/>}
  </G>;
}

export function PipPetWelcome({species,width=300}:{species:string;width?:number}){
  const [lick]=useState(()=>new Animated.Value(0));
  useEffect(()=>{
    let alive=true,animation:Animated.CompositeAnimation|undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(!alive||reduced)return;animation=Animated.loop(Animated.sequence([Animated.timing(lick,{toValue:1,duration:320,useNativeDriver:true,isInteraction:false}),Animated.timing(lick,{toValue:0,duration:320,useNativeDriver:true,isInteraction:false}),Animated.delay(650)]),{iterations:4});animation.start();}).catch(()=>{});
    const stop=()=>{animation?.stop();lick.setValue(0);};
    const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',stop),activity=AppState.addEventListener('change',state=>{if(state!=='active')stop();});
    return()=>{alive=false;stop();motion.remove();activity.remove();};
  },[lick,species]);
  return <View accessible accessibilityRole="image" accessibilityLabel={`Pip and your ${species.toLowerCase()} sharing a playful kiss`} style={{width,maxWidth:'100%',aspectRatio:4/3,alignSelf:'center'}}>
    <Svg width="100%" height="100%" viewBox="0 0 320 240" accessible={false}>
      <Path d="M19 157C-5 78 79 27 152 50C221 12 312 65 301 145C316 220 195 235 132 215C57 236 19 208 19 157Z" fill={C.peach}/>
      <Ellipse cx="158" cy="211" rx="124" ry="11" fill="#d8c5ac"/>
      <G transform="translate(35 64) scale(1.05)"><PipDrawing pose="hold"/></G>
      <G transform="translate(150 74) scale(.95)"><PetFace species={species}/></G>
      <Path d="M155 64C126 45 139 23 155 40C173 22 187 45 155 64ZM222 36c-14-12-7-21 2-14 10-8 16 3-2 14" fill={C.rust}/>
      <SvgText x="160" y="235" textAnchor="middle" fontSize="12" fill={C.ink}>{species}</SvgText>
    </Svg>
    <Animated.View testID="pip-tongue" pointerEvents="none" style={{position:'absolute',left:'38%',top:'60%',width:'19%',height:'14%',transform:[{scaleX:lick.interpolate({inputRange:[0,1],outputRange:[.85,1.05]})},{rotate:lick.interpolate({inputRange:[0,1],outputRange:['-3deg','4deg']})}]}}><Svg width="100%" height="100%" viewBox="0 0 104 34" accessible={false}><Path d="M5 15Q28 9 51 22" fill="none" stroke="#bb6574" strokeWidth="10" strokeLinecap="round"/><Path d="M97 21Q73 31 51 22" fill="none" stroke="#e39ba5" strokeWidth="10" strokeLinecap="round"/><Path d="M8 15q20-2 39 7m46-1q-18 7-36 2" fill="none" stroke="#f3c4c6" strokeWidth="2" strokeLinecap="round"/></Svg></Animated.View>
  </View>;
}
