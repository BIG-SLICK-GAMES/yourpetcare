import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { C, Icon, IconName, Label } from '../../ui';

import { useApp } from '../../state';
import { GlossyHome } from '../../GlossyHome';

const tabIcon = (name:IconName) => function TabIcon({focused}:{focused:boolean}) { return <View style={{width:46,height:35,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:focused?C.sage:'transparent'}}><Icon name={name} size={23}/></View>; };
export default function TabLayout() {
  const {onboardingOpen}=useApp();
  return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:C.ink,tabBarInactiveTintColor:C.muted,tabBarStyle:{display:onboardingOpen?'none':'flex',backgroundColor:C.paper,borderTopColor:C.line,minHeight:84,paddingTop:9,paddingBottom:10},tabBarLabelStyle:{fontFamily:'Manrope',fontSize:10,fontWeight:'700'}}}>
    <Tabs.Screen name="pets" options={{title:'My pets',tabBarIcon:tabIcon('paw')}}/>
    <Tabs.Screen name="map" options={{title:'Map',tabBarIcon:tabIcon('map')}}/>
    <Tabs.Screen name="home" options={{title:'Home',tabBarButton:props=><View style={{flex:1}}><Pressable onPress={props.onPress} onLongPress={props.onLongPress} accessibilityRole="button" accessibilityLabel="Home" accessibilityState={props.accessibilityState} style={{alignItems:'center',justifyContent:'center',marginTop:-26,minHeight:94}}><GlossyHome/><Label small style={{fontSize:10,fontWeight:'800'}}>Home</Label></Pressable></View>}}/>
    <Tabs.Screen name="index" options={{title:'Companion',href:null}}/>
    <Tabs.Screen name="calendar" options={{title:'Calendar',tabBarIcon:tabIcon('calendar')}}/>
    <Tabs.Screen name="account" options={{title:'You',tabBarIcon:tabIcon('person')}}/>
  </Tabs>;
}
