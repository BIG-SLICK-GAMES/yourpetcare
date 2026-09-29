import React from 'react';
import { Pressable, View } from 'react-native';
import { C, Label } from './ui';
import { SvgXml } from 'react-native-svg';
import { brandLogo } from './data/brand-art';

export function BrandLogo({width=240}:{width?:number}){return <View accessible accessibilityRole="image" accessibilityLabel="Your Pet Care" style={{width,maxWidth:'100%',aspectRatio:430/158,alignSelf:'center'}}><SvgXml xml={brandLogo} width="100%" height="100%" accessible={false} aria-hidden={true}/></View>;}

export function BrandHeader({onSignIn,onSignOut,busy=false}:{onSignIn?:()=>void;onSignOut?:()=>void;busy?:boolean}) {
  if(!onSignIn&&!onSignOut)return <BrandLogo width={360}/>;
  return <View testID="brand-header" style={{width:'100%',maxWidth:440,alignSelf:'center',flexDirection:'row',alignItems:'center',gap:12}}>
    <View style={{flex:1,minWidth:0}}><BrandLogo width={360}/></View>
    <Pressable testID={onSignOut?"header-signout":"header-signin"} accessibilityRole="button" accessibilityLabel={onSignOut?"Sign out":"Sign in"} accessibilityState={{disabled:busy}} disabled={busy} onPress={onSignOut||onSignIn} style={({pressed})=>({minWidth:72,minHeight:44,borderRadius:18,backgroundColor:C.sage,alignItems:'center',justifyContent:'center',opacity:pressed?.65:1})}>
      <Label small style={{fontWeight:'700'}}>{onSignOut?'Sign out':'Sign in'}</Label>
    </Pressable>
  </View>;
}
