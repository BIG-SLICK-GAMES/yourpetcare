import { Pressable } from '../../FeedbackPressable';
import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { C, Icon, IconName, Label } from '../../ui';

import { useApp } from '../../state';
import { GlossyHome } from '../../GlossyHome';
import { APP_WIDTH } from '../../app-width';

const tabIcon = (name:IconName) => function TabIcon({focused}:{focused:boolean}) { return <View style={{width:46,height:35,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:focused?C.sage:'transparent'}}><Icon name={name} size={23}/></View>; };
export default function TabLayout() {
  const {onboardingOpen,account}=useApp();
  return <Tabs screenOptions={({route})=>({headerShown:false,tabBarLabelPosition:'below-icon',tabBarActiveTintColor:C.ink,tabBarInactiveTintColor:C.muted,tabBarStyle:{display:onboardingOpen||(route.name==='account'&&!account)?'none':'flex',width:'100%',maxWidth:route.name==='index'?APP_WIDTH.conversation:route.name==='account'?APP_WIDTH.standard:APP_WIDTH.wide,alignSelf:'center',backgroundColor:C.paper,borderTopColor:C.line,minHeight:96,paddingTop:6,paddingBottom:8},tabBarLabelStyle:{fontFamily:'Manrope',fontSize:10,fontWeight:'700'}})}>
    <Tabs.Screen name="pets" options={{title:'My pets',tabBarIcon:tabIcon('paw')}}/>
    <Tabs.Screen name="map" options={{title:'Map',tabBarIcon:tabIcon('map')}}/>
    <Tabs.Screen name="home" options={{title:'Home',tabBarButton:props=><View style={{flex:1}}><Pressable onPress={props.onPress} onLongPress={props.onLongPress} accessibilityRole="tab" accessibilityLabel="Home" accessibilityState={props.accessibilityState} style={{alignItems:'center',justifyContent:'center',minHeight:78}}><GlossyHome/><Label small style={{fontSize:10,fontWeight:'800'}}>Home</Label></Pressable></View>}}/>
    <Tabs.Screen name="index" options={{title:'Companion',href:null}}/>
    <Tabs.Screen name="calendar" options={{title:'Calendar',tabBarIcon:tabIcon('calendar')}}/>
    <Tabs.Screen name="account" options={{title:'You',tabBarIcon:tabIcon('person')}}/>
  </Tabs>;
}
