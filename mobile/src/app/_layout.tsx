import React from 'react';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { AppState } from '../state';
import { C } from '../ui';
import { WelcomeProvider } from '../WelcomeIntro';

export default function Layout() {
  const [loaded, error] = useFonts({ Manrope: require('../../assets/fonts/manrope.ttf') });
  if (!loaded && !error) return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.paper}}><ActivityIndicator color={C.ink}/></View>;
  return <SafeAreaProvider><Head><title>Your Pet Care</title></Head><AppState><WelcomeProvider><StatusBar style="dark"/><Stack screenOptions={{headerStyle:{backgroundColor:C.paper},headerTintColor:C.ink,headerShadowVisible:false,contentStyle:{backgroundColor:C.paper}}}>
    <Stack.Screen name="(tabs)" options={{headerShown:false,title:'Your Pet Care'}}/>
    <Stack.Screen name="pet-editor" options={{title:'Meet your crew'}}/>
    <Stack.Screen name="plan" options={{title:'Planning'}}/>
    <Stack.Screen name="review" options={{title:'Your choice',presentation:'modal'}}/>
    <Stack.Screen name="explore" options={{title:'Explore'}}/>
    <Stack.Screen name="service" options={{title:'Service details'}}/>
    <Stack.Screen name="privacy" options={{title:'Your data'}}/>
    <Stack.Screen name="help" options={{title:'Help & tutorials'}}/>
  </Stack></WelcomeProvider></AppState></SafeAreaProvider>;
}
