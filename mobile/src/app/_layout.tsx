import React from 'react';
import { Stack, router } from 'expo-router';
import Head from 'expo-router/head';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppState } from '../state';
import { C, Icon, Label } from '../ui';
import { WelcomeProvider } from '../WelcomeIntro';

function HomeShortcut() {
  return <Pressable accessibilityRole="button" accessibilityLabel="Go home" onPress={()=>router.dismissTo('/home')} style={({pressed})=>({minHeight:44,paddingHorizontal:12,marginRight:8,borderRadius:24,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:C.sage,opacity:pressed?.7:1})}><Icon name="home" size={22}/><Label small style={{fontWeight:'800'}}>Home</Label></Pressable>;
}

export default function Layout() {
  const [loaded, error] = useFonts({ Manrope: require('../../assets/fonts/manrope.ttf') });
  if (!loaded && !error) return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.paper}}><ActivityIndicator color={C.ink}/></View>;
  return <SafeAreaProvider><Head><title>Your Pet Care</title></Head><AppState><WelcomeProvider><StatusBar style="dark"/><Stack screenOptions={{headerRight:()=> <HomeShortcut/>,headerBackButtonDisplayMode:'minimal',headerStyle:{backgroundColor:C.paper},headerTintColor:C.ink,headerShadowVisible:false,contentStyle:{backgroundColor:C.paper}}}>
    <Stack.Screen name="(tabs)" options={{headerShown:false,title:'Your Pet Care'}}/>
    <Stack.Screen name="pet-editor" options={{title:'Meet your crew'}}/>
    <Stack.Screen name="plan" options={{title:'Planning'}}/>
    <Stack.Screen name="review" options={{title:'Your choice',presentation:'modal'}}/>
    <Stack.Screen name="explore" options={{title:'Explore'}}/>
    <Stack.Screen name="service" options={{title:'Service details'}}/>
    <Stack.Screen name="privacy" options={{title:'Your data'}}/>
    <Stack.Screen name="help" options={{title:'Help & tutorials'}}/>
    <Stack.Screen name="supplies" options={{title:'Supplies & savings'}}/>
  </Stack></WelcomeProvider></AppState></SafeAreaProvider>;
}
