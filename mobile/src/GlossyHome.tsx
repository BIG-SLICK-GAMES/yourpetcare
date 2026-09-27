import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Stop } from 'react-native-svg';
import { Icon } from './ui';

export function GlossyHome(){return <View style={{width:60,height:60,borderRadius:30,boxShadow:'0px 5px 10px rgba(20,55,43,0.23)',alignItems:'center',justifyContent:'center'}}><Svg width={60} height={60} viewBox="0 0 76 76" accessible={false}><Defs><LinearGradient id="home-gloss" x1="0" y1="0" x2="0.2" y2="1"><Stop offset="0" stopColor="#79b9a0"/><Stop offset="0.42" stopColor="#397c64"/><Stop offset="1" stopColor="#163f35"/></LinearGradient><LinearGradient id="home-shine" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="white" stopOpacity=".65"/><Stop offset="1" stopColor="white" stopOpacity="0"/></LinearGradient></Defs><Circle cx="38" cy="38" r="36" fill="url(#home-gloss)" stroke="#faf8f1" strokeWidth="4"/><Ellipse cx="38" cy="22" rx="26" ry="17" fill="url(#home-shine)"/><Circle cx="38" cy="38" r="30" fill="none" stroke="#b5d8c8" strokeOpacity=".45" strokeWidth="1"/></Svg><View style={{position:'absolute'}}><Icon name="home" color="white" size={27}/></View></View>;}
