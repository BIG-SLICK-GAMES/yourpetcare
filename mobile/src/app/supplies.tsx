import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { SupplyFeed, SupplyPreferences } from '../types';
import { fetchSupplyOffers, sourceFor } from '../supply-offers';
import { enableReminders } from '../reminders';
import ServiceMap from '../ServiceMap';
import * as Location from 'expo-location';
import { Button, C, Card, Chip, ErrorText, Field, Heading, Icon, Label, Screen, Title, s } from '../ui';

export default function Supplies(){
  const app=useApp();
  return app.loading?<Screen><ActivityIndicator color={C.ink}/></Screen>:<SuppliesEditor key={app.account?.id||'guest'}/>;
}
function SuppliesEditor(){
  const app=useApp(),params=useLocalSearchParams<{replace?:string}>();
  const previous=params.replace===app.activeProposal?.id&&app.activeProposal?.action==='set_supplies'?app.activeProposal:null;
  const initial=(previous?.data as SupplyPreferences|undefined)||app.account?.supplies||{stores:[],saleAlerts:false};
  const [stores,setStores]=useState(initial.stores),[alerts,setAlerts]=useState(initial.saleAlerts),[name,setName]=useState(''),[website,setWebsite]=useState(''),[query,setQuery]=useState(''),[feeds,setFeeds]=useState<SupplyFeed[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [mapOpen,setMapOpen]=useState(false),[shopId,setShopId]=useState(''),[center,setCenter]=useState<{lat:number;lon:number}>(),[locating,setLocating]=useState(false);
  useEffect(()=>{let active=true;if(app.account)void fetchSupplyOffers(app.account,app.catalog).then(rows=>{if(active)setFeeds(rows);});return()=>{active=false;};},[app.account,app.catalog]);
  const sources=app.catalog.supplyStores||[];
  const shops=useMemo(()=>app.catalog.providers.filter(p=>p.category==='shop'&&`${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase())),[app.catalog.providers,query]);
  const chosen=shops.find(p=>p.id===shopId);
  const matches=[...shops].sort((a,b)=>Number(/petbarn|petstock|pets domain|my pet warehouse|best friends/i.test(a.name))-Number(/petbarn|petstock|pets domain|my pet warehouse|best friends/i.test(b.name))).slice(0,8);
  async function locate(){setLocating(true);setError('');try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error('Location is off. Search by store or suburb instead.');const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setCenter({lat:position.coords.latitude,lon:position.coords.longitude});}catch(e){setError((e as Error).message);}finally{setLocating(false);}}
  function add(storeName=name,storeWebsite=website,address?:string,providerId?:string){
    const entry={name:storeName.trim(),website:storeWebsite.trim(),...(address?{address}:{}),...(providerId?{providerId}:{})};if(!entry.name){setError('What is the store called?');return;}
    if(entry.website){try{const url=new URL(entry.website);if(url.protocol!=='https:'||url.username||url.password)throw new Error();}catch{setError('Use a full https:// store website without sign-in details.');return;}}
    if(stores.length>=5){setError('You can keep up to five preferred stores.');return;}
    if(stores.some(s=>s.name.toLowerCase()===entry.name.toLowerCase()&&s.website.toLowerCase()===entry.website.toLowerCase()&&(s.address||'')===(entry.address||''))){setError('That store is already in your list.');return;}
    setStores([...stores,entry]);setName('');setWebsite('');setError('');setNotice('Added to your list. Review your preferences to save.');return true;
  }
  async function save(){if(!app.account){router.push('/account');return;}setBusy(true);setError('');try{await app.propose({action:'set_supplies',data:{stores,saleAlerts:alerts},replaceId:previous?.id});router.push('/review');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function open(url:string){try{await Linking.openURL(url);}catch{setError('Could not open the store website.');}}
  function sale(title:string,place:string){router.push({pathname:'/plan',params:{title:title.slice(0,150),location:place.slice(0,300),minutes:'5',planKind:'reminder',planCategory:'supplies'}});}
  return <Screen><View style={s.row}><Icon name="food" size={34}/><View style={{flex:1}}><Title>Supplies & savings</Title></View></View><Label>Your local favourites, all in one place.</Label>
    <Heading>Your preferred stores</Heading>
    {stores.map((store,i)=><Card key={`${store.name}-${i}`}><View style={s.row}><Icon name="home"/><View style={{flex:1}}><Heading>{store.name}</Heading>{!!store.address&&<Label small>{store.address}</Label>}{!!store.website&&<Label small>{store.website}</Label>}</View></View><Label small muted>{sourceFor(store.website,store.name,sources)?'Store offer feed available':'No connected offer feed. You can still add sale reminders.'}</Label><View style={s.wrap}>{!!store.website&&<Button secondary title={`Visit ${store.name}`} onPress={()=>void open(store.website)}/>}<Button secondary title={`Remove ${store.name}`} onPress={()=>setStores(stores.filter((_,index)=>index!==i))}/></View></Card>)}
    <Button title={mapOpen?'Close store map':'Find my store on the map'} icon="map" onPress={()=>setMapOpen(!mapOpen)}/>
    {mapOpen&&<View style={{gap:14}}><Field label="Search store map" value={query} onChange={setQuery} placeholder="Store name, suburb or postcode"/><ServiceMap providers={shops} onSelect={setShopId} center={center}/><Button secondary title="Stores near my location" icon="map" busy={locating} onPress={()=>void locate()}/>{chosen&&<Card color={C.blue}><Heading>{chosen.name}</Heading><Label>{chosen.address||'Address not recorded'}</Label><Button title="Add this store to my list" icon="plus" onPress={()=>{if(add(chosen.name,chosen.website,chosen.address,chosen.id))setMapOpen(false);}}/></Card>}<Label small muted>{shops.length} directory stores · Map © OpenStreetMap contributors. Can’t find yours? Add its name below.</Label></View>}
    <Card color={C.sage}><Heading>Add your local store</Heading><Field label="Store name" value={name} onChange={setName} placeholder="Your feed store, aquarium or pet shop"/><Field label="Store website (optional)" value={website} onChange={setWebsite} placeholder="https://…"/><Button secondary title="Add to my list" icon="plus" onPress={()=>add()}/></Card>
    <Field label="Find a directory store" value={query} onChange={setQuery} placeholder="Store name or suburb"/>
    <View style={{gap:8}}>{!!query.trim()&&matches.map(p=><Button key={p.id} secondary title={`Choose ${p.name}${p.address?' · '+p.address:''}`} onPress={()=>add(p.name,p.website,p.address,p.id)}/>)}</View>
    <Heading>Offer alerts</Heading><View style={s.wrap}><Chip title="Off" active={!alerts} onPress={()=>setAlerts(false)}/><Chip title="On for connected stores" active={alerts} onPress={()=>setAlerts(true)}/></View><Label small muted>Feeds refresh when you open the app or check for offers. Phone alerts need notification permission. Background monitoring and browser notifications are not connected.</Label>
    <ErrorText message={error}/>{!!notice&&<Label>{notice}</Label>}<Button title={app.account?'Review store preferences':'Sign in to save stores'} busy={busy} icon="check" onPress={()=>void save()}/>
    {app.account&&Platform.OS!=='web'&&<Button secondary title="Enable phone reminders" icon="bell" onPress={()=>void enableReminders(app.account!).then(()=>setNotice('Phone reminders enabled. Saved sale dates use your calendar reminders.')).catch(e=>setError((e as Error).message))}/>}
    <Heading>Offers from your saved stores</Heading><Label small muted>Retailer listings, not personalised diet or treatment recommendations. Check current price, stock and terms with the store.</Label>
    {!!app.account&&<Button secondary title="Check for offers" icon="search" onPress={()=>void app.refresh()}/>}
    {!feeds.length&&<Card><Label>Save a store with a connected feed to see its offers here. Any store can have a sale reminder.</Label></Card>}
    {feeds.map(feed=><View key={feed.storeId} style={{gap:12}}><Heading>{sources.find(s=>s.id===feed.storeId)?.name||'Store offers'}</Heading><Label small muted>{feed.status==='unavailable'?'The store feed is unavailable. Please try later.':`Checked ${new Date(feed.checkedAt).toLocaleString('en-AU')}`}</Label>{feed.status==='connected'&&!feed.offers.length&&<Label>No offers were listed in this feed.</Label>}{feed.offers.map(offer=><Card key={offer.id} color={C.gold}><Heading>{offer.title}</Heading><Label small>Sale dates aren’t supplied. Choose when you’d like a reminder.</Label><Button secondary title="Check offer at store" onPress={()=>void open(offer.url)}/><Button title="Add a sale reminder" icon="calendar" onPress={()=>sale(`Check ${offer.title}`,`${offer.storeName} · ${offer.url}`)}/></Card>)}</View>)}
    <Button secondary title="Add a sale date myself" icon="calendar" onPress={()=>sale('Check store sale',app.account?.supplies?.stores[0]?.name||'')}/><Label small muted>You choose the date and confirm before it enters your calendar. No purchase is made.</Label>
  </Screen>;
}
