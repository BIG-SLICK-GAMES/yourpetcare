import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { brandLogo } from './data/brand-art';

export function BrandLogo({width=240}:{width?:number}){return <View accessible accessibilityRole="image" accessibilityLabel="Your Pet Care" style={{width,height:width*158/430}}><SvgXml xml={brandLogo} width={width} height={width*158/430} accessible={false}/></View>;}
