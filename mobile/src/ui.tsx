import React, { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Ellipse, SvgXml } from 'react-native-svg';
import { art } from './data/pet-art';
import { APP_WIDTH } from './app-width';

export const C = { ink: '#244e46', muted: '#5d6c62', paper: '#faf8f1', card: '#ffffff', line: '#dfe4d8', sage: '#dce7d7', peach: '#f0ddcd', rust: '#a95535', lavender: '#e6deee', blue: '#dcebf0', gold: '#f0e4bb', error: '#983c36' };
export type IconName = 'paw'|'chat'|'map'|'calendar'|'heart'|'tree'|'plane'|'care'|'play'|'plus'|'person'|'search'|'arrow'|'check'|'close'|'food'|'mic'|'sound'|'stop'|'help'|'home'|'bell'|'groom';
export function Icon({name, size=26, color=C.ink}: {name: IconName; size?: number; color?: string}) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    {name==='bell'&&<><Path d="M7 21V13a9 9 0 0 1 18 0v8l3 4H4ZM12 28q4 5 8 0M16 2v3"/></>}
    {name==='groom'&&<><Circle cx="7" cy="25" r="4"/><Circle cx="25" cy="25" r="4"/><Path d="m10 22 16-18M22 22 6 4"/></>}
    {name==='home'&&<><Path d="M3 15 16 4l13 11M7 13v15h18V13M12 28v-9h8v9"/></>}
    {name==='help'&&<><Circle cx="16" cy="16" r="13"/><Path d="M12 11c0-6 11-6 9 0-1 3-5 3-5 7"/><Circle cx="16" cy="23" r="1" fill={color}/></>}
    {name==='mic'&&<><Rect x="11" y="3" width="10" height="17" rx="5"/><Path d="M6 15v2a10 10 0 0 0 20 0v-2M16 27v4M11 31h10"/></>}
    {name==='sound'&&<><Path d="M4 12h6l8-7v22l-8-7H4ZM23 11q5 5 0 10m4-15q10 10 0 20"/></>}
    {name==='stop'&&<Rect x="7" y="7" width="18" height="18" rx="4" fill={color}/>}
    {name === 'paw' && <><Ellipse cx="16" cy="22" rx="7" ry="5" fill={color}/><Circle cx="6" cy="14" r="3" fill={color}/><Circle cx="12" cy="7" r="3" fill={color}/><Circle cx="22" cy="8" r="3" fill={color}/><Circle cx="27" cy="16" r="3" fill={color}/></>}
    {name === 'chat' && <><Path d="M7 5h18a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H13l-7 5v-5a3 3 0 0 1-3-3V9a4 4 0 0 1 4-4Z"/><Circle cx="10" cy="15" r="1"/><Circle cx="16" cy="15" r="1"/><Circle cx="22" cy="15" r="1"/></>}
    {name === 'map' && <><Path d="m3 7 8-3 10 3 8-3v23l-8 3-10-3-8 3ZM11 4v23M21 7v23"/><Circle cx="18" cy="13" r="4" fill={C.peach}/></>}
    {name === 'calendar' && <><Rect x="4" y="6" width="24" height="23" rx="5"/><Path d="M4 13h24M10 3v7M22 3v7m-12 9h4m5 0h3m-12 5h4"/></>}
    {name === 'heart' && <><Path d="M16 27 5 16C-2 7 9-1 16 8 23-1 34 7 27 16Z" fill={C.peach}/><Path d="M10 10v5a6 6 0 0 0 12 0v-5m-6 11v5q0 5 7 3"/><Circle cx="25" cy="27" r="3" fill={C.sage}/></>}
    {name === 'tree' && <><Path d="M16 23v7M8 30h16"/><Path d="M16 3C3 3 3 13 7 15c-9 10 4 14 9 8 5 6 18 2 9-8 4-2 4-12-9-12Z" fill={C.sage}/></>}
    {name === 'plane' && <Path d="m4 14 10 2L20 3l4 1-4 14 9 5-2 4-10-5-7 7-3-2 5-8-9-2Z" fill={C.blue}/>}
    {name === 'care' && <><Path d="m5 13 12-9q5-3 9 2t-1 8l-12 9q-5 4-9-1t1-9Z" fill={C.peach}/><Path d="m13 10 7 10m-10-6 7-5"/></>}
    {name === 'play' && <><Circle cx="16" cy="17" r="12"/><Path d="M7 7q16 10 18 18M4 18Q20 20 20 5"/></>}
    {name === 'plus' && <Path d="M16 5v22M5 16h22"/>}
    {name === 'person' && <><Circle cx="16" cy="10" r="6"/><Path d="M5 29v-4c0-11 22-11 22 0v4"/></>}
    {name === 'search' && <><Circle cx="13" cy="13" r="9"/><Path d="m20 20 9 9"/></>}
    {name === 'arrow' && <Path d="M5 16h22m-9-9 9 9-9 9"/>}
    {name === 'check' && <Path d="m5 17 7 7L28 7"/>}
    {name === 'close' && <Path d="m7 7 18 18M25 7 7 25"/>}
    {name === 'food' && <><Path d="M3 15h26l-4 12H7ZM10 9q-4-4 0-7m7 7q-4-4 0-7m7 7q-4-4 0-7"/></>}
  </Svg>;
}
export function Label({children, small=false, muted=false, style}: {children: React.ReactNode; small?: boolean; muted?: boolean; style?: any}) { return <Text style={[s.text, small && s.small, muted && {color:C.muted}, style]}>{children}</Text>; }
export function Title({children}: {children: React.ReactNode}) { return <Text accessibilityRole="header" style={s.title}>{children}</Text>; }
export function Heading({children}: {children: React.ReactNode}) { return <Text accessibilityRole="header" style={s.heading}>{children}</Text>; }
export function Card({children, color=C.card, style}: {children: React.ReactNode; color?: string; style?: any}) { return <View style={[s.card,{backgroundColor:color},style]}>{children}</View>; }
export function Button({title, onPress, secondary=false, icon, busy=false, disabled=false}: {title: string; onPress: () => void; secondary?: boolean; icon?: IconName; busy?: boolean; disabled?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:disabled||busy}} disabled={disabled||busy} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary, (disabled||busy)&&{opacity:.55},pressed&&{opacity:.8}]}>{busy?<ActivityIndicator color={secondary?C.ink:'white'}/>:icon?<Icon name={icon} size={20} color={secondary?C.ink:'white'}/>:null}<Text style={[s.buttonText,secondary&&{color:C.ink}]}>{title}</Text></Pressable>;
}
export function CircleButton({title, icon, color=C.sage, onPress, active=false}: {title: string; icon: IconName; color?: string; onPress:()=>void; active?:boolean}) {
  const scale=useState(() => new Animated.Value(1))[0];
  const animate = async (toValue:number) => { if (await AccessibilityInfo.isReduceMotionEnabled()) return; Animated.spring(scale,{toValue,useNativeDriver:true,speed:25,bounciness:7}).start(); };
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{selected:active}} onPress={onPress} onPressIn={()=>void animate(.91)} onPressOut={()=>void animate(1)} onHoverIn={()=>void animate(1.06)} onHoverOut={()=>void animate(1)} style={s.circleItem}><Animated.View style={[s.circle,{backgroundColor:color,borderColor:active?C.ink:color,transform:[{scale}]}]}><Icon name={icon} size={30}/></Animated.View><Label small style={{textAlign:'center',fontWeight:'700'}}>{title}</Label></Pressable>;
}
export function Avatar({species='Dog',size=80}: {species?:string;size?:number}) { return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:C.sage,overflow:'hidden'}}><SvgXml xml={art[species]||art.Dog} width={size} height={size}/></View>; }
export function Field({label,value,onChange,placeholder='',secure=false,multiline=false,keyboardType='default'}: {label:string;value:string;onChange:(v:string)=>void;placeholder?:string;secure?:boolean;multiline?:boolean;keyboardType?:any}) {
  return <View style={{gap:7}}><Label small style={{fontWeight:'700'}}>{label}</Label><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.muted} secureTextEntry={secure} multiline={multiline} keyboardType={keyboardType} autoCapitalize={secure?'none':'sentences'} style={[s.input,multiline&&{minHeight:90,textAlignVertical:'top'}]}/></View>;
}
export function Chip({title,onPress,active=false}: {title:string;onPress:()=>void;active?:boolean}) { return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected:active}} style={[s.chip,active&&{backgroundColor:C.ink,borderColor:C.ink}]}><Label small style={active&&{color:'white'}}>{title}</Label></Pressable>; }
export function Screen({children, scroll=true, wide=false}: {children:React.ReactNode;scroll?:boolean;wide?:boolean}) { const content=[s.content,wide&&{maxWidth:APP_WIDTH.wide}];return <SafeAreaView style={s.screen} edges={['top','left','right']}>{scroll?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={content}>{children}</ScrollView>:<View style={[content,{flex:1}]}>{children}</View>}</SafeAreaView>; }
export function ErrorText({message}: {message:string}) { return message?<Text accessibilityRole="alert" style={s.error}>{message}</Text>:null; }
export const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:C.paper},content:{width:'100%',maxWidth:APP_WIDTH.standard,alignSelf:'center',padding:22,paddingBottom:40,gap:20},
  text:{fontFamily:'Manrope',fontSize:15,lineHeight:23,color:C.ink},small:{fontSize:12,lineHeight:19},title:{fontFamily:'Manrope',fontSize:32,lineHeight:40,fontWeight:'800',color:C.ink,letterSpacing:-1},heading:{fontFamily:'Manrope',fontSize:20,lineHeight:28,fontWeight:'800',color:C.ink},
  card:{borderRadius:25,padding:22,borderWidth:1,borderColor:C.line,gap:14},button:{minHeight:49,borderRadius:16,paddingHorizontal:18,paddingVertical:12,backgroundColor:C.ink,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:9},secondary:{backgroundColor:C.paper,borderWidth:1,borderColor:C.line},buttonText:{fontFamily:'Manrope',fontSize:14,fontWeight:'700',color:'white'},
  row:{flexDirection:'row',alignItems:'center',gap:12},wrap:{flexDirection:'row',flexWrap:'wrap',gap:9},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},circleItem:{width:78,alignItems:'center',gap:8},circle:{width:62,height:62,borderRadius:31,borderWidth:2,alignItems:'center',justifyContent:'center'},input:{fontFamily:'Manrope',fontSize:16,lineHeight:23,color:C.ink,borderWidth:1,borderColor:C.line,backgroundColor:'white',padding:14,borderRadius:14,minHeight:50},chip:{paddingHorizontal:14,paddingVertical:11,borderRadius:22,borderWidth:1,borderColor:C.line,backgroundColor:'white'},error:{fontFamily:'Manrope',color:C.error,fontSize:14,lineHeight:21,padding:12,backgroundColor:'#f9e7e2',borderRadius:12},
});
