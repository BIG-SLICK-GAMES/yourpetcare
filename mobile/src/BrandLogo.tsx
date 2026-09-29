import { retailer, retailerActive } from './retailer';
import { retailerLogoSvg, retailerLogoImage } from './retailer-assets';
import { Pressable } from './FeedbackPressable';
import React from 'react';
import { Image, View } from 'react-native';
import { C, Label } from './ui';
import { SvgXml } from 'react-native-svg';
import { brandLogo } from './data/brand-art';

export function BrandLogo({width=240}:{width?:number}){if(retailerActive)return <View testID="retailer-logo" style={{width,maxWidth:'100%',alignSelf:'center',gap:5,padding:12,borderRadius:22,backgroundColor:retailer.headerBackground}}><View accessible accessibilityRole="image" accessibilityLabel={retailer.name} style={{height:52,justifyContent:'center'}}>{retailerLogoSvg?<SvgXml xml={retailerLogoSvg} width="100%" height="100%" accessible={false}/>:retailerLogoImage?<Image source={retailerLogoImage} resizeMode="contain" style={{width:'100%',maxWidth:184,height:30,alignSelf:'center'}}/>:<Label style={{fontSize:30,fontWeight:'800',textAlign:'center',color:retailer.headerText}}>{retailer.name}</Label>}</View><Label small style={{textAlign:'center',fontSize:11,color:retailer.headerText}}>Your Pet Care concept</Label></View>;return <View accessible accessibilityRole="image" accessibilityLabel="Your Pet Care" style={{width,maxWidth:'100%',aspectRatio:430/158,alignSelf:'center'}}><SvgXml xml={brandLogo} width="100%" height="100%" accessible={false} aria-hidden={true}/></View>;}

export function BrandHeader({onSignIn,onSignOut,busy=false}:{onSignIn?:()=>void;onSignOut?:()=>void;busy?:boolean}) {
  if(!onSignIn&&!onSignOut)return <BrandLogo width={360}/>;
  return <View testID="brand-header" style={{width:'100%',maxWidth:440,alignSelf:'center',flexDirection:'row',alignItems:'center',gap:12}}>
    <View style={{flex:1,minWidth:0}}><BrandLogo width={360}/></View>
    <Pressable testID={onSignOut?"header-signout":"header-signin"} accessibilityRole="button" accessibilityLabel={onSignOut?"Sign out":"Sign in"} accessibilityState={{disabled:busy}} disabled={busy} onPress={onSignOut||onSignIn} style={({pressed})=>({minWidth:72,minHeight:44,borderRadius:18,backgroundColor:C.sage,alignItems:'center',justifyContent:'center',opacity:pressed?.65:1})}>
      <Label small style={{fontWeight:'700'}}>{onSignOut?'Sign out':'Sign in'}</Label>
    </Pressable>
  </View>;
}
