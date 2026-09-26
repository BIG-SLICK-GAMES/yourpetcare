import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { C, Icon, IconName } from '../../ui';

const tabIcon = (name:IconName) => function TabIcon({focused}:{focused:boolean}) { return <View style={{width:46,height:35,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:focused?C.sage:'transparent'}}><Icon name={name} size={23}/></View>; };
export default function TabLayout() {
  return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:C.ink,tabBarInactiveTintColor:C.muted,tabBarStyle:{backgroundColor:C.paper,borderTopColor:C.line,minHeight:76,paddingTop:9,paddingBottom:10},tabBarLabelStyle:{fontFamily:'Manrope',fontSize:10,fontWeight:'700'}}}>
    <Tabs.Screen name="index" options={{title:'Companion',tabBarIcon:tabIcon('chat')}}/>
    <Tabs.Screen name="pets" options={{title:'My pets',tabBarIcon:tabIcon('paw')}}/>
    <Tabs.Screen name="map" options={{title:'Map',tabBarIcon:tabIcon('map')}}/>
    <Tabs.Screen name="calendar" options={{title:'Calendar',tabBarIcon:tabIcon('calendar')}}/>
    <Tabs.Screen name="account" options={{title:'You',tabBarIcon:tabIcon('person')}}/>
  </Tabs>;
}
