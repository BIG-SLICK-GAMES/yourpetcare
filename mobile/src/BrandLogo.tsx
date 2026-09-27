import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { brandLogo } from './data/brand-art';

export function BrandLogo({width=240}:{width?:number}){return <View accessible accessibilityRole="image" accessibilityLabel="Your Pet Care" style={{width,maxWidth:'100%',aspectRatio:430/158,alignSelf:'center'}}><SvgXml xml={brandLogo} width="100%" height="100%" accessible={false}/></View>;}
