import { Pressable } from './FeedbackPressable';
import React, { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Platform, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Pip } from './Pip';
import { C, Icon, IconName, Label } from './ui';

const menu: {title:string;icon:IconName;color:string;path:'/pets'|'/plan'|'/map'|'/shopping'|'/calendar'|'/account'|'/help'|'/explore'}[]=[
  {title:'My pets',icon:'paw',color:C.sage,path:'/pets'},
  {title:'Plan',icon:'calendar',color:C.gold,path:'/plan'},
  {title:'Map',icon:'map',color:C.blue,path:'/map'},
  {title:'Shopping',icon:'shop',color:C.lavender,path:'/shopping'},
  {title:'Calendar',icon:'bell',color:C.peach,path:'/calendar'},
  {title:'You',icon:'person',color:C.sage,path:'/account'},
  {title:'Help',icon:'help',color:C.blue,path:'/help'},
  {title:'Discover',icon:'search',color:C.gold,path:'/explore'},
];

export function PipOrbitMenu({onInteractionChange,onTalk}:{onInteractionChange?:(active:boolean)=>void;onTalk:()=>void}){
  const [width,setWidth]=useState(276),[first,setFirst]=useState(menu.length-1);
  const [shift]=useState(()=>new Animated.Value(0)),[fade]=useState(()=>new Animated.Value(0));
  const turning=useRef(false),reduce=useRef(true),suppressTap=useRef(0);
  const radius=(width-72)/2,cy=radius+38;
  useFocusEffect(useCallback(()=>{
    let active=true;
    const intro=(reduced:boolean)=>{reduce.current=reduced;fade.stopAnimation();fade.setValue(0);if(active&&!reduced)Animated.sequence([Animated.delay(1200),Animated.timing(fade,{toValue:1,duration:650,useNativeDriver:true,isInteraction:false}),Animated.delay(1200),Animated.timing(fade,{toValue:0,duration:650,useNativeDriver:true,isInteraction:false})]).start();};
    void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)intro(value);}).catch(()=>{});
    const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',intro);
    return()=>{active=false;sub.remove();fade.stopAnimation();onInteractionChange?.(false);};
  },[fade,onInteractionChange]));
  function rotate(direction:number){
    if(turning.current)return;turning.current=true;
    const finish=()=>{setFirst(value=>(value+direction+menu.length)%menu.length);shift.setValue(0);turning.current=false;};
    if(reduce.current){finish();return;}
    Animated.timing(shift,{toValue:-direction,duration:260,useNativeDriver:true}).start(finish);
  }
  // PanResponder registers these callbacks; refs are read only when a gesture fires.
  // eslint-disable-next-line react-hooks/refs
  const [gesture]=useState(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>12&&Math.abs(g.dx)>Math.abs(g.dy)*1.3,
    onPanResponderGrant:()=>{suppressTap.current=Date.now()+600;},
    onPanResponderMove:()=>{suppressTap.current=Date.now()+600;},
    onPanResponderRelease:(_,g)=>{suppressTap.current=Date.now()+350;if(Math.abs(g.dx)>25)rotate(g.dx<0?1:-1);},
  }));
  return <View testID="pip-orbit-menu" onLayout={e=>setWidth(Math.min(e.nativeEvent.layout.width,400))} style={{width:'100%',maxWidth:400,alignSelf:'center',gap:4}}>
    <View testID="orbit-swipe-area" {...gesture.panHandlers} onTouchStart={()=>onInteractionChange?.(true)} onTouchEnd={()=>onInteractionChange?.(false)} onTouchCancel={()=>onInteractionChange?.(false)} style={[{height:cy+65,overflow:'hidden'},Platform.OS==='web'&&({touchAction:'none'} as any)]}>
      <View pointerEvents="none" style={{position:'absolute',left:36,top:38,width:radius*2,height:radius*2,borderRadius:radius,borderWidth:1,borderColor:C.line}}/>
      {[-1,0,1,2,3,4,5].map(slot=>{
        const item=menu[(first+slot+menu.length)%menu.length],visible=slot>=0&&slot<=4;
        const samples=[-1,-.5,0,.5,1],angles=samples.map(value=>(-180+(slot+value)*45)*Math.PI/180);
        return <Animated.View key={slot} pointerEvents={visible?'auto':'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible?'auto':'no-hide-descendants'} aria-hidden={!visible} style={{position:'absolute',left:width/2-35,top:cy-28,width:70,alignItems:'center',opacity:shift.interpolate({inputRange:samples,outputRange:samples.map(value=>slot+value<0||slot+value>4?0:1)}),transform:[{translateX:shift.interpolate({inputRange:samples,outputRange:angles.map(a=>radius*Math.cos(a))})},{translateY:shift.interpolate({inputRange:samples,outputRange:angles.map(a=>radius*Math.sin(a))})}]}}>
          <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{selected:slot===2}} accessibilityHint={slot===2?'Highlighted menu item. Tap to open.':'Tap to open.'} tabIndex={visible?0:-1} onPress={()=>{if(!turning.current&&Date.now()>suppressTap.current)router.push(item.path);}} style={{alignItems:'center',gap:3,width:70}}><Animated.View testID={slot===2?'orbit-active-item':undefined} style={{width:54,height:54,borderRadius:27,backgroundColor:item.color,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:slot===2?C.ink:C.paper,transform:[{scale:shift.interpolate({inputRange:samples,outputRange:samples.map(value=>1+.24*Math.max(0,1-Math.abs(slot+value-2)))})}]}}><Icon name={item.icon} size={27}/></Animated.View><Label small style={{fontWeight:slot===2?'900':'700',textAlign:'center',marginTop:slot===2?6:0}}>{item.title}</Label></Pressable>
        </Animated.View>;
      })}
      <Pressable testID="orbit-talk" accessibilityRole="button" accessibilityLabel="Talk to Pip with microphone" onPress={()=>{if(Date.now()>suppressTap.current)onTalk();}} style={{position:'absolute',left:width/2-47,top:cy-43,width:94,height:94,borderRadius:47,alignItems:'center',justifyContent:'center',backgroundColor:C.sage}}>
        <Animated.View pointerEvents="none" style={{position:'absolute',opacity:fade.interpolate({inputRange:[0,1],outputRange:[1,0]})}}><Pip size={92}/></Animated.View>
        <Animated.View pointerEvents="none" style={{position:'absolute',opacity:fade,width:94,height:94,borderRadius:47,backgroundColor:C.ink,alignItems:'center',justifyContent:'center'}}><Icon name="mic" size={40} color="white"/></Animated.View>
        <View pointerEvents="none" style={{position:'absolute',right:-3,bottom:0,width:30,height:30,borderRadius:15,backgroundColor:C.ink,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.paper}}><Icon name="mic" size={16} color="white"/></View>
      </Pressable>
    </View>
    <Label small style={{textAlign:'center',fontWeight:'700'}}>Tap Pip to talk</Label>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12,paddingTop:4}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous menu item" onPress={()=>rotate(-1)} style={({pressed})=>({flex:1,maxWidth:150,minHeight:46,borderRadius:23,backgroundColor:C.sage,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',opacity:pressed?.7:1})}><View style={{transform:[{rotate:'180deg'}]}}><Icon name="arrow" size={20}/></View><Label small style={{fontWeight:'800'}}>Previous</Label></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next menu item" onPress={()=>rotate(1)} style={({pressed})=>({flex:1,maxWidth:150,minHeight:46,borderRadius:23,backgroundColor:C.sage,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',opacity:pressed?.7:1})}><Label small style={{fontWeight:'800'}}>Next</Label><Icon name="arrow" size={20}/></Pressable>
    </View>
  </View>;
}
