import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { api } from '../api';
import { ShoppingChange, SupplyFeed, SupplySource } from '../types';
import { Button, C, Card, Chip, ErrorText, Field, Heading, Icon, Label, Screen, Title, s } from '../ui';

const emptySources:SupplySource[]=[];

export default function Shopping() {
  const app=useApp(),params=useLocalSearchParams<{tab?:string;item?:string;store?:string}>();
  const [tab,setTab]=useState(params.tab==='offers'?'offers':'list');
  const [name,setName]=useState(params.item||''),[store,setStore]=useState(params.store||'');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [feeds,setFeeds]=useState<SupplyFeed[]>([]),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0);
  const sources=app.catalog.supplyStores||emptySources;
  useEffect(()=>{if(tab!=='offers')return;let active=true;
    async function load(){setLoading(true);try{const rows=await Promise.all(sources.map(source=>api<SupplyFeed>(`supply-offers?store=${encodeURIComponent(source.id)}`).catch(()=>({storeId:source.id,status:'unavailable' as const,checkedAt:new Date().toISOString(),offers:[]}))));if(active)setFeeds(rows);}finally{if(active)setLoading(false);}}
    void load();return()=>{active=false;};
  },[tab,sources,refresh]);
  async function change(input:ShoppingChange){setBusy(true);setError('');setNotice('');try{await app.shopping(input);if(input.action==='add')setName('');setNotice(input.action==='remove'?'Item removed.':input.action==='add'?'Added to your shopping list.':input.done?'Marked as collected.':'Back on your list.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function visit(url:string){try{if(!url.startsWith('https://'))throw new Error('This store link is unavailable.');await Linking.openURL(url);}catch(e){setError((e as Error).message);}}
  const items=app.account?.shopping||[],remaining=items.filter(i=>!i.done);
  return <Screen><View style={s.row}><Icon name="shop" size={36}/><Title>Shopping</Title></View>
    <View style={s.wrap}><Chip title="My list" active={tab==='list'} onPress={()=>setTab('list')}/><Chip title="Specials" active={tab==='offers'} onPress={()=>setTab('offers')}/></View>
    <ErrorText message={error}/>{!!notice&&<View accessibilityLiveRegion="polite"><Label>{notice}</Label></View>}
    {tab==='list'?<>
      {!app.account?<Card color={C.sage}><Heading>A little less to remember</Heading><Label>Keep your pet supplies together and tick them off as you shop.</Label><Button title="Sign in to save a list" onPress={()=>router.push('/account')}/></Card>:<>
        <Card><Field label="What do you need?" value={name} onChange={setName} placeholder="Food, hay, litter, favourite treats..."/>
          <View style={s.wrap}>{['Food','Treats','Bedding','Waste bags'].map(item=><Chip key={item} title={item} onPress={()=>setName(item)}/>)}</View>
          <Field label="Store (optional)" value={store} onChange={setStore} placeholder="Any store"/>
          {!!app.account.supplies?.stores.length&&<View style={s.wrap}><Chip title="Any store" active={!store} onPress={()=>setStore('')}/>{app.account.supplies.stores.map((entry,i)=><Chip key={i} title={entry.name} active={store===entry.name} onPress={()=>setStore(entry.name)}/>)}</View>}
          <Button title="Add to my list" icon="plus" busy={busy} disabled={!name.trim()} onPress={()=>void change({action:'add',name,store})}/>
        </Card>
        <Heading>{remaining.length?`${remaining.length} to pick up`:'All caught up'}</Heading>
        {!items.length&&<Label muted>Add something above when you need it. Your list saves to your account.</Label>}
        {[...remaining,...items.filter(i=>i.done)].map(item=><Card key={item.id} color={item.done?C.paper:C.card}><View style={s.row}>
          <Pressable accessibilityRole="checkbox" aria-checked={item.done} accessibilityLabel={`Collected ${item.name}`} accessibilityState={{checked:item.done,disabled:busy}} disabled={busy} onPress={()=>void change({action:'check',id:item.id,done:!item.done})} style={{flex:1,minHeight:48,flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:30,height:30,borderRadius:10,borderWidth:2,borderColor:C.ink,alignItems:'center',justifyContent:'center'}}>{item.done&&<Icon name="check" size={22}/>}</View><View style={{flex:1}}><Label style={{textDecorationLine:item.done?'line-through':'none'}}>{item.name}</Label><Label small muted>{item.store||'Any store'}</Label></View></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name} from shopping list`} disabled={busy} onPress={()=>void change({action:'remove',id:item.id})} style={{padding:12,minHeight:44,minWidth:44}}><Icon name="close" size={20}/></Pressable>
        </View></Card>)}
      </>}
      <Button secondary title="Find a local store" icon="map" onPress={()=>router.push({pathname:'/map',params:{category:'shop'}})}/>
      <Button secondary title="Browse specials" icon="shop" onPress={()=>setTab('offers')}/>
    </>:<>
      <Label>Offers direct from connected businesses.</Label>
      <Button secondary title="Refresh specials" busy={loading} onPress={()=>setRefresh(refresh+1)}/>
      {loading&&<ActivityIndicator color={C.ink}/>}
      {!loading&&!sources.length&&<Card><Heading>No connected offers yet</Heading><Label>Find a local business on the map or visit your saved store.</Label></Card>}
      {feeds.map(feed=>{const source=sources.find(s=>s.id===feed.storeId);return <View key={feed.storeId} style={{gap:12}}><Heading>{source?.name||'Store'}</Heading>
        {feed.status==='unavailable'?<Label muted>Offers are unavailable right now. You can still visit the store.</Label>:!feed.offers.length?<Label muted>No specials listed today.</Label>:<Label small muted>Checked {new Date(feed.checkedAt).toLocaleString('en-AU')}</Label>}
        {feed.offers.map(offer=><Card key={offer.id} color={C.gold}><Label small style={{fontWeight:'800'}}>RETAILER OFFER</Label><Heading>{offer.title}</Heading><Label small>{offer.storeName} · Check price, stock and terms with the store.</Label><Button title="View offer at store" onPress={()=>void visit(offer.url)}/><Button secondary title="Add to shopping list" icon="plus" onPress={()=>{setName(offer.title);setStore(offer.storeName);setTab('list');setNotice('Ready to add. Check the item, then tap Add to my list.');}}/><Button secondary title="Remind me about this offer" icon="calendar" onPress={()=>router.push({pathname:'/plan',params:{title:`Check ${offer.title}`.slice(0,150),location:`${offer.storeName} ${offer.url}`.slice(0,300),minutes:'5',planKind:'reminder',planCategory:'supplies'}})}/><Label small muted>Sale dates aren&apos;t supplied. You choose and confirm your reminder.</Label></Card>)}
        {!!source&&<Button secondary title={`Visit ${source.name}`} onPress={()=>void visit(source.website)}/>}
      </View>;})}
      <Label small muted>Paid placements will be labelled Advertisement. These retailer feeds are not paid recommendations. No purchase is made in the app.</Label>
      <Button secondary title="My saved stores" icon="shop" onPress={()=>router.push('/supplies')}/>
      <Button secondary title="Find local businesses" icon="map" onPress={()=>router.push({pathname:'/map',params:{category:'shop'}})}/>
    </>}
  </Screen>;
}
