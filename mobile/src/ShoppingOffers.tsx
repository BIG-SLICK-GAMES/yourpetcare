import React, {useEffect,useState} from 'react';
import {ActivityIndicator,Linking,View} from 'react-native';
import {router} from 'expo-router';
import {useApp} from './state';
import {api} from './api';
import {SupplyFeed,SupplySource} from './types';
import {Button,C,Card,ErrorText,Heading,Label} from './ui';
const emptySources:SupplySource[]=[];
export function ShoppingOffers({onAdd}:{onAdd:(name:string,store:string)=>void}){
const app=useApp();const [error,setError]=useState('');
  const [feeds,setFeeds]=useState<SupplyFeed[]>([]),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0);
  const sources=app.catalog.supplyStores||emptySources;
  useEffect(()=>{let active=true;
    async function load(){setLoading(true);try{const rows=await Promise.all(sources.map(source=>api<SupplyFeed>(`supply-offers?store=${encodeURIComponent(source.id)}`).catch(()=>({storeId:source.id,status:'unavailable' as const,checkedAt:new Date().toISOString(),offers:[]}))));if(active)setFeeds(rows);}finally{if(active)setLoading(false);}}
    void load();return()=>{active=false;};
  },[sources,refresh]);
  async function visit(url:string){try{if(!url.startsWith('https://'))throw new Error('This store link is unavailable.');await Linking.openURL(url);}catch(e){setError((e as Error).message);}}
return <><ErrorText message={error}/>      <Label>Offers direct from connected businesses.</Label>
      <Button secondary title="Refresh specials" busy={loading} onPress={()=>setRefresh(refresh+1)}/>
      {loading&&<ActivityIndicator color={C.ink}/>}
      {!loading&&!sources.length&&<Card><Heading>No connected offers yet</Heading><Label>Find a local business on the map or visit your saved store.</Label></Card>}
      {feeds.map(feed=>{const source=sources.find(s=>s.id===feed.storeId);return <View key={feed.storeId} style={{gap:12}}><Heading>{source?.name||'Store'}</Heading>
        {feed.status==='unavailable'?<Label muted>Offers are unavailable right now. You can still visit the store.</Label>:!feed.offers.length?<Label muted>No specials listed today.</Label>:<Label small muted>Checked {new Date(feed.checkedAt).toLocaleString('en-AU')}</Label>}
        {feed.offers.map(offer=><Card key={offer.id} color={C.gold}><Label small style={{fontWeight:'800'}}>RETAILER OFFER</Label><Heading>{offer.title}</Heading><Label small>{offer.storeName} · Check price, stock and terms with the store.</Label><Button title="View offer at store" onPress={()=>void visit(offer.url)}/><Button secondary title="Add to shopping list" icon="plus" onPress={()=>{onAdd(offer.title,offer.storeName);}}/><Button secondary title="Remind me about this offer" icon="calendar" onPress={()=>router.push({pathname:'/plan',params:{title:`Check ${offer.title}`.slice(0,150),location:`${offer.storeName} ${offer.url}`.slice(0,300),minutes:'5',planKind:'reminder',planCategory:'supplies'}})}/><Label small muted>Sale dates aren&apos;t supplied. You choose and confirm your reminder.</Label></Card>)}
        {!!source&&<Button secondary title={`Visit ${source.name}`} onPress={()=>void visit(source.website)}/>}
      </View>;})}
      <Label small muted>Paid placements will be labelled Advertisement. These retailer feeds are not paid recommendations. No purchase is made in the app.</Label>
      <Button secondary title="My saved stores" icon="shop" onPress={()=>router.push('/supplies')}/>
      <Button secondary title="Find local businesses" icon="map" onPress={()=>router.push({pathname:'/map',params:{category:'shop'}})}/></>;
}
