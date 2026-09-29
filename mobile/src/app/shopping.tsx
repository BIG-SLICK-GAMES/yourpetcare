import { RetailerInvitation } from '../RetailerDiscovery';
import { PipAssistant } from '../PipAssistant';
import { Pressable } from '../FeedbackPressable';
import React, { useState } from 'react';
import { Linking, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { ShoppingChange } from '../types';
import { ShoppingOffers } from '../ShoppingOffers';
import { Button, C, Card, Chip, ErrorText, Field, Heading, Icon, Label, Screen, Title, s } from '../ui';

export default function Shopping(){
  const app=useApp(),params=useLocalSearchParams<{list?:string;item?:string;store?:string;tab?:string}>();
  const [listId,setListId]=useState(params.list||''),[creating,setCreating]=useState(false),[renaming,setRenaming]=useState(false),[deleting,setDeleting]=useState(false);
  const [listName,setListName]=useState(''),[name,setName]=useState(params.item||''),[store,setStore]=useState(params.store||'');
  const [adding,setAdding]=useState(!!params.item),[offers,setOffers]=useState(params.tab==='offers'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const lists=app.account?.shoppingLists||(app.account?.shopping?.length?[{id:'essentials',name:'My shopping list'}]:[]);
  const list=lists.find(l=>l.id===listId),items=(app.account?.shopping||[]).filter(i=>(i.listId||'essentials')===listId),remaining=items.filter(i=>!i.done);
  async function change(input:ShoppingChange){
    setBusy(true);setError('');setNotice('');
    try{
      const account=await app.shopping(input);
      if(input.action==='create_list'){const made=account.shoppingLists?.find(l=>l.name===input.name.trim());if(made)setListId(made.id);setCreating(false);setNotice('Your new list is ready.');}
      else if(input.action==='rename_list'){setRenaming(false);setNotice('List renamed.');}
      else if(input.action==='delete_list'){setDeleting(false);setListId('');setNotice('List deleted. Your other lists are unchanged.');}
      else if(input.action==='add'){setName('');setAdding(false);setNotice(`Added ${input.name} to ${list?.name||'your list'}.`);}
      else setNotice(input.action==='remove'?'Item removed.':input.done?'Marked as collected.':'Back on your list.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function compare(item:string){try{await Linking.openURL(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item)}`);}catch{setError('Could not open Google Shopping.');}}
  function back(){setListId('');setAdding(false);setOffers(false);setRenaming(false);setError('');setNotice('');}
  return <Screen><View style={s.row}><Icon name="shop" size={32}/><View style={{flex:1}}><Title>{list?list.name:offers?'Specials':'My lists'}</Title></View></View>
    {!!list&&<Button secondary title="My lists" icon="arrow" onPress={back}/>}
    <RetailerInvitation/><ErrorText message={error}/>{!!notice&&<View accessibilityLiveRegion="polite"><Label>{notice}</Label></View>}
    {!list&&offers?<><Button secondary title="My lists" onPress={()=>setOffers(false)}/><ShoppingOffers onAdd={(item,retailer)=>{setName(item);setStore(retailer);setAdding(true);setOffers(false);setNotice('Choose a list, or make a new one, to add this offer.');}}/></>:!app.account?<Card color={C.sage}><Heading>Your pet shopping, together</Heading><Label>Save lists and let Pip help you choose what to add.</Label><Button title="Sign in to save your lists" onPress={()=>router.push('/account')}/></Card>:!list?<>
      {lists.map(entry=>{const left=(app.account?.shopping||[]).filter(i=>(i.listId||'essentials')===entry.id&&!i.done).length;return <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Open ${entry.name}`} onPress={()=>{setListId(entry.id);setNotice('');}} style={{padding:20,borderRadius:24,backgroundColor:C.sage,minHeight:88,flexDirection:'row',alignItems:'center',gap:16}}><Icon name="shop" size={32}/><View style={{flex:1}}><Heading>{entry.name}</Heading><Label small>{left?`${left} to pick up`:'Ready when you are'}</Label></View><Icon name="arrow"/></Pressable>;})}
      {!lists.length&&!creating&&<Label>One list, one less thing to remember.</Label>}
      {creating?<Card><Field label="List name" value={listName} onChange={setListName} placeholder="Weekly supplies"/><Button title="Create list" icon="plus" busy={busy} disabled={!listName.trim()} onPress={()=>void change({action:'create_list',name:listName})}/><Button secondary title="Cancel" disabled={busy} onPress={()=>setCreating(false)}/></Card>:<Button title="New list" icon="plus" onPress={()=>{setListName('');setCreating(true);}}/>}
    </>:<>
      <PipAssistant scene="shopping" shoppingListId={list.id} prompt={`What shall we add to ${list.name}? Tell me what you need, or ask for ideas.`}/>
      <View style={s.wrap}><Button title="Add an item" icon="plus" onPress={()=>{setAdding(true);setOffers(false);}}/><Button secondary title="Specials" icon="shop" onPress={()=>{setOffers(!offers);setAdding(false);}}/></View>
      {offers&&<ShoppingOffers onAdd={(item,retailer)=>{setName(item);setStore(retailer);setAdding(true);setOffers(false);}}/>}
      {adding&&<Card><Field label="What do you need?" value={name} onChange={setName} placeholder="Food, hay, litter, favourite treats..."/>
        <View style={s.wrap}>{['Food','Treats','Bedding','Waste bags'].map(item=><Chip key={item} title={item} onPress={()=>setName(item)}/>)}</View>
        <Field label="Store (optional)" value={store} onChange={setStore} placeholder="Any store"/>
        {!!app.account.supplies?.stores.length&&<View style={s.wrap}><Chip title="Any store" active={!store} onPress={()=>setStore('')}/>{app.account.supplies.stores.map((entry,i)=><Chip key={i} title={entry.name} active={store===entry.name} onPress={()=>setStore(entry.name)}/>)}</View>}
        <Button title="Add to this list" icon="plus" busy={busy} disabled={!name.trim()} onPress={()=>void change({action:'add',listId:list.id,name,store})}/>
        <Button secondary title="Search Google Shopping" icon="search" disabled={!name.trim()} onPress={()=>void compare(name.trim())}/><Label small muted>Opens Google Shopping to compare current retailer listings.</Label>
        <Button secondary title="Cancel adding" onPress={()=>setAdding(false)}/>
      </Card>}
      <Heading>{items.length?remaining.length?`${remaining.length} to pick up`:'All collected':'Your list is ready'}</Heading>
      {[...remaining,...items.filter(i=>i.done)].map(item=><Card key={item.id} color={item.done?C.paper:C.card}><View style={s.row}>
        <Pressable accessibilityRole="checkbox" aria-checked={item.done} accessibilityLabel={`Collected ${item.name}`} accessibilityState={{checked:item.done,disabled:busy}} disabled={busy} onPress={()=>void change({action:'check',listId:list.id,id:item.id,done:!item.done})} style={{flex:1,minHeight:48,flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:30,height:30,borderRadius:10,borderWidth:2,borderColor:C.ink,alignItems:'center',justifyContent:'center'}}>{item.done&&<Icon name="check" size={22}/>}</View><View style={{flex:1}}><Label style={{textDecorationLine:item.done?'line-through':'none'}}>{item.name}</Label><Label small muted>{item.store||'Any store'}</Label></View></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name} from shopping list`} disabled={busy} onPress={()=>void change({action:'remove',listId:list.id,id:item.id})} style={{padding:12,minHeight:44,minWidth:44}}><Icon name="close" size={20}/></Pressable>
      </View>{!item.done&&<Button secondary title={`Compare ${item.name}`} icon="search" onPress={()=>void compare(item.name)}/>}</Card>)}
      <Button secondary title="Find a local store" icon="map" onPress={()=>router.push({pathname:'/map',params:{category:'shop'}})}/>
      {renaming?<Card><Field label="New list name" value={listName} onChange={setListName}/><Button title="Save list name" busy={busy} disabled={!listName.trim()} onPress={()=>void change({action:'rename_list',listId:list.id,name:listName})}/><Button secondary title="Cancel rename" onPress={()=>setRenaming(false)}/></Card>:<View style={s.wrap}><Button secondary title="Rename list" icon="care" onPress={()=>{setListName(list.name);setRenaming(true);}}/><Button secondary title="Delete list" icon="close" onPress={()=>{setError('');setDeleting(true);}}/></View>}
    </>}
    <Modal visible={deleting&&!!list} transparent animationType="none" onRequestClose={()=>{if(!busy)setDeleting(false);}}><SafeAreaView style={{flex:1,padding:20,backgroundColor:'rgba(20,45,39,.55)',alignItems:'center',justifyContent:'center'}}><View accessibilityViewIsModal style={{width:'100%',maxWidth:420,maxHeight:'95%',padding:22,borderRadius:26,backgroundColor:C.paper,gap:16}}><ScrollView style={{flexShrink:1}}><Heading>Delete {list?.name}?</Heading><Label>This removes this list and its items. Your other lists stay saved.</Label><ErrorText message={error}/></ScrollView><Button title="Keep my list" disabled={busy} onPress={()=>setDeleting(false)}/><Button secondary title="Delete this list" busy={busy} onPress={()=>list&&void change({action:'delete_list',listId:list.id})}/></View></SafeAreaView></Modal>
  </Screen>;
}
