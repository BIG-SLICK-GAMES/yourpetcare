import { PipSectionArt } from './PipSectionArt';
import React,{useState} from 'react';
import {Image,Linking,View} from 'react-native';
import {router} from 'expo-router';
import {retailer,retailerActive} from './retailer';
import {retailerHero,retailerCompanion,retailerProductImages} from './retailer-assets';
import {Button,C,Card,ErrorText,Heading,Icon,Label,s} from './ui';

export function RetailerInvitation(){
 if(!retailerActive)return null;
 return <Card color={C.sage}><View style={s.row}><Icon name={retailer.id==='petsonline'?'search':'shop'} size={32}/><View style={{flex:1}}><Heading>{retailer.discoveryTitle}</Heading><Label small>{retailer.tagline}</Label></View></View><Button secondary title={`Explore ${retailer.name}`} icon="arrow" onPress={()=>router.push('/retailer')}/></Card>;
}
export function RetailerDiscovery(){
 const [error,setError]=useState('');
 async function open(url:string){setError('');try{const u=new URL(url);if(u.protocol!=='https:')throw Error();await Linking.openURL(u.href);}catch{setError('This page could not open. Please try again.');}}
 if(!retailerActive)return null;
 return <View testID="retailer-discovery" style={{gap:20}}>
  <Heading>{retailer.discoveryTitle}</Heading><Label>{retailer.intro}</Label><ErrorText message={error}/>
  <Card color={C.sage}>
   {!!retailerHero&&<View style={{flexDirection:'row',gap:8}}><Image source={retailerHero} accessibilityLabel={retailer.heroAlt} resizeMode="contain" style={{flex:1,height:180,borderRadius:18}}/>{!!retailerCompanion&&<Image source={retailerCompanion} accessibilityLabel="Barnadette, Petbarn's cat character" resizeMode="contain" style={{flex:1,height:180,borderRadius:18}}/>}</View>}
   {!retailerHero&&<View style={{alignItems:'center'}}><PipSectionArt scene="discover"/></View>}
   <Heading>{retailer.mascotTitle}</Heading><Label small>{retailer.mascotText}</Label>
   <Button secondary title={retailer.id==='petsonline'?'Explore pet guides':'Meet the characters'} icon="paw" onPress={()=>void open(retailer.mascotUrl)}/>
  </Card>
  <Heading>{retailer.id==='petsonline'?'Buying guides':'Explore the range'}</Heading>
  {retailer.products.map(product=><Card key={product.id}>
   <View style={s.row}>{retailerProductImages[product.id]?<Image source={retailerProductImages[product.id]} accessibilityLabel={product.name} resizeMode="contain" style={{width:96,height:112,borderRadius:14}}/>:<View style={{width:76,height:76,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:C.sage}}><Icon name={product.kind==='guide'?'search':'shop'} size={38}/></View>}<View style={{flex:1,gap:5}}><Heading>{product.name}</Heading><Label small muted>{product.description}</Label></View></View>
   <Button secondary title={product.kind==='guide'?'Read the guide':product.kind==='range'?'Browse this range':'View product'} icon="arrow" onPress={()=>void open(product.url)}/>
   <Button secondary title="Add to a shopping list" icon="plus" onPress={()=>router.push({pathname:'/shopping',params:{item:product.name,store:retailer.id==='petsonline'?'':retailer.name}})}/>
  </Card>)}
  <Label small muted>{retailer.id==='petsonline'?'These are independent buying guides, not a live store catalogue.':'Check the retailer website for current prices, stock and suitability.'}</Label>
  <Heading>{retailer.id==='petsonline'?'Discover more':'Care beyond the basket'}</Heading>
  {retailer.links.map(link=><Button key={link.url} secondary title={link.title} icon="arrow" onPress={()=>void open(link.url)}/>)}
  <Button title="Plan with Pip" icon="mic" onPress={()=>router.push('/plan')}/>
  <Label small muted>Your Pet Care concept. Your YPC account keeps your pets and plans together. Retailer websites open separately.</Label>
 </View>;
}
