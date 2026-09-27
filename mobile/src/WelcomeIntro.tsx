import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TalkingPip } from './Pip';
import { BrandLogo } from './BrandLogo';
import { Avatar, Button, C, Icon, IconName, Label, Title } from './ui';

const ReplayContext=createContext(()=>{});
export const useWelcomeIntro=()=>useContext(ReplayContext);
const scenes=[
  {title:'Your pets.\nYour companion.',text:'Talk to your AI companion. We’ll get to know your crew.',icon:'chat' as IconName,color:C.sage},
  {title:'Less to\nremember.',text:'Meal times, vet details and plans. You choose what we save.',icon:'calendar' as IconName,color:C.peach},
  {title:'More time\ntogether.',text:'Walks, rest stops and little adventures, planned around your pet.',icon:'map' as IconName,color:C.blue},
];

export function WelcomeProvider({children}:{children:React.ReactNode}){
  const [visible,setVisible]=useState(false),[manual,setManual]=useState(true),[session,setSession]=useState(0);
  useEffect(()=>{
    let alive=true;
    // Browsers cannot detect screen readers; react-native-web always reports true.
    const screenReader=Platform.OS==='web'?Promise.resolve(false):AccessibilityInfo.isScreenReaderEnabled();
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(),screenReader]).then(([reduced,reader])=>{if(alive)setManual(reduced||reader);}).catch(()=>{});
    const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',()=>setManual(true));
    const reader=AccessibilityInfo.addEventListener('screenReaderChanged',()=>setManual(true));
    return()=>{alive=false;motion.remove();reader.remove();};
  },[]);
  const close=useCallback(()=>setVisible(false),[]);
  const replay=useCallback(()=>{setSession(n=>n+1);setVisible(true);},[]);
  return <ReplayContext.Provider value={replay}>{children}<Modal visible={visible} animationType="none" onRequestClose={close} presentationStyle="fullScreen">{visible&&<WelcomeFilm key={session} manual={manual} onClose={close}/>}</Modal></ReplayContext.Provider>;
}

function WelcomeFilm({manual,onClose}:{manual:boolean;onClose:()=>void}){
  const [scene,setScene]=useState(0),[paused,setPaused]=useState(false),[active,setActive]=useState(true);
  const [reveal]=useState(()=>new Animated.Value(manual?1:0));
  const [drift]=useState(()=>new Animated.Value(0));
  const current=scenes[scene];
  useEffect(()=>{const subscription=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>subscription.remove();},[]);
  useEffect(()=>{
    reveal.setValue(manual?1:0);drift.setValue(0);
    if(manual||paused||!active){reveal.setValue(1);return;}
    const entrance=Animated.timing(reveal,{toValue:1,duration:450,useNativeDriver:true,isInteraction:false});
    const float=Animated.loop(Animated.sequence([Animated.timing(drift,{toValue:1,duration:1000,useNativeDriver:true,isInteraction:false}),Animated.timing(drift,{toValue:0,duration:1000,useNativeDriver:true,isInteraction:false})]));
    entrance.start();float.start();
    return()=>{entrance.stop();float.stop();};
  },[scene,manual,paused,active,reveal,drift]);
  useEffect(()=>{
    if(manual||paused||!active)return;
    const timer=setTimeout(()=>scene===2?onClose():setScene(n=>n+1),3400);
    return()=>clearTimeout(timer);
  },[scene,manual,paused,active,onClose]);
  const movement={transform:[{translateY:drift.interpolate({inputRange:[0,1],outputRange:[0,-10]})}]};
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><BrandLogo width={168}/><Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={onClose} style={styles.skip}><Label>Skip</Label></Pressable></View>
    <ScrollView contentContainerStyle={styles.story} bounces={false}>
      <Animated.View style={[styles.scene,{opacity:reveal,transform:[{translateY:reveal.interpolate({inputRange:[0,1],outputRange:[18,0]})}]}]}>
        <View style={[styles.stage,{backgroundColor:current.color}]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.ring}/><Animated.View style={[styles.hero,movement]}><Icon name={current.icon} size={82}/></Animated.View>
          {scene===0?<><Animated.View style={[styles.topLeft,movement]}><Avatar species="Dog" size={74}/></Animated.View><View style={styles.topRight}><Avatar species="Bird" size={60}/></View><View style={styles.bottomLeft}><Avatar species="Horse" size={62}/></View><Animated.View style={[styles.bottomRight,movement]}><Avatar species="Cat" size={76}/></Animated.View><View style={styles.smallPet}><Avatar species="Reptile" size={46}/></View></>:scene===1?<><View style={[styles.tile,styles.topLeft]}><Icon name="food" size={36}/></View><Animated.View style={[styles.tile,styles.bottomRight,movement]}><Icon name="heart" size={38}/></Animated.View><View style={[styles.tick,styles.bottomLeft]}><Icon name="check" size={25} color="white"/></View></>:<><View style={[styles.tile,styles.topLeft]}><Icon name="tree" size={40}/></View><Animated.View style={[styles.tile,styles.bottomRight,movement]}><Icon name="food" size={34}/></Animated.View><View style={styles.bottomLeft}><Avatar species="Dog" size={62}/></View><View style={[styles.tick,styles.topRight]}><Icon name="heart" size={25} color="white"/></View></>}
        </View>
        <View style={styles.copy} accessibilityLiveRegion="polite"><View style={{flexDirection:'row',alignItems:'center',gap:14}}><TalkingPip size={64} words={`${current.title}. ${current.text}`} active={active} onListen={()=>setPaused(true)}/><View style={{flex:1}}><Title>{current.title}</Title></View></View><Label style={styles.description}>{current.text}</Label></View>
      </Animated.View>
    </ScrollView>
    <View style={styles.footer}><View style={styles.progress}>{scenes.map((_,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={`Introduction ${i+1} of 3`} accessibilityState={{selected:i===scene}} onPress={()=>{setScene(i);setPaused(true);}} style={styles.dotTarget}><View style={[styles.dot,{backgroundColor:i===scene?C.ink:C.line,width:i===scene?28:8}]}/></Pressable>)}</View><Label small muted style={{textAlign:'center'}}>We&apos;re a team. One day at a time.</Label><Button title={scene===2?'Let’s get started':'Next'} onPress={()=>scene===2?onClose():setScene(n=>n+1)}/>{!manual&&<Pressable accessibilityRole="button" accessibilityLabel={paused?'Play introduction':'Pause introduction'} onPress={()=>setPaused(!paused)} style={styles.pause}><Label small muted>{paused?'Play':'Pause'}</Label></Pressable>}</View>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:C.paper},header:{width:'100%',maxWidth:560,alignSelf:'center',paddingHorizontal:22,paddingTop:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brand:{flexDirection:'row',gap:9,alignItems:'center'},skip:{padding:12,minHeight:48},
  story:{flexGrow:1,justifyContent:'center',alignItems:'center',paddingHorizontal:28,paddingVertical:18},scene:{width:'100%',maxWidth:420,alignItems:'center',gap:28},stage:{width:276,height:276,borderRadius:138,alignItems:'center',justifyContent:'center'},ring:{position:'absolute',width:216,height:216,borderRadius:108,borderWidth:1,borderColor:'#ffffffaa'},hero:{backgroundColor:C.paper,width:136,height:136,borderRadius:44,alignItems:'center',justifyContent:'center',transform:[{rotate:'-4deg'}]},
  topLeft:{position:'absolute',left:0,top:16},topRight:{position:'absolute',right:6,top:8},bottomLeft:{position:'absolute',left:10,bottom:14},bottomRight:{position:'absolute',right:0,bottom:12},smallPet:{position:'absolute',left:122,bottom:-12},tile:{width:74,height:74,borderRadius:26,backgroundColor:'white',alignItems:'center',justifyContent:'center'},tick:{width:48,height:48,borderRadius:24,backgroundColor:C.ink,alignItems:'center',justifyContent:'center'},copy:{width:'100%',gap:14,minHeight:158},description:{fontSize:17,lineHeight:26,maxWidth:350},footer:{width:'100%',maxWidth:420,alignSelf:'center',paddingHorizontal:28,paddingBottom:12,gap:12},progress:{flexDirection:'row',justifyContent:'center'},dotTarget:{height:44,minWidth:44,alignItems:'center',justifyContent:'center'},dot:{height:8,borderRadius:4},pause:{alignItems:'center',justifyContent:'center',minHeight:44},
});
