import { RetailerInvitation } from '../RetailerDiscovery';
import { PipAssistant } from '../PipAssistant';
import { Pressable } from '../FeedbackPressable';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { ShoppingChange } from '../types';
import { ShoppingOffers } from '../ShoppingOffers';
import { Button, C, Card, Chip, ErrorText, Field, Heading, Icon, Label, Screen, Title, s } from '../ui';

export default function Shopping(){
  const app=useApp(),params=useLocalSearchParams<{list?:string;item?:string;store?:string;tab?:string}>();
  const [listId,setListId]=useState(params.list||''),[renaming,setRenaming]=useState(false),[deleting,setDeleting]=useState(false);
  const [draft,setDraft]=useState(''),[draftVersion,setDraftVersion]=useState(0),[retry,setRetry]=useState(0);
  const screenRef=useRef<ScrollView>(null);
  const preparing=useRef(false);
  const [listName,setListName]=useState(''),[name,setName]=useState(params.item||''),[store,setStore]=useState(params.store||'');
  const [adding,setAdding]=useState(false),[offers,setOffers]=useState(params.tab==='offers'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const lists=app.account?.shoppingLists||(app.account?.shopping?.length?[{id:'essentials',name:'My shopping list'}]:[]);
  const list=lists.find(l=>l.id===listId)||lists[0],items=(app.account?.shopping||[]).filter(i=>(i.listId||'essentials')===list?.id),remaining=items.filter(i=>!i.done);
  useEffect(()=>{
    if(!app.account||lists.length||preparing.current)return;
    preparing.current=true;
    void app.shopping({action:'ensure_list'}).catch(e=>setError(e.message)).finally(()=>{preparing.current=false;});
    // Only initialise for an empty account, not on every context render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[app.account?.id,lists.length,retry]);
  async function change(input:ShoppingChange){
    setBusy(true);setError('');setNotice('');
    try{
      const account=await app.shopping(input);
      if(input.action==='create_list'){const made=account.shoppingLists?.find(l=>l.name===input.name.trim());if(made)setListId(made.id);setNotice('Your new list is ready.');}
      else if(input.action==='rename_list'){setRenaming(false);setNotice('List renamed.');}
      else if(input.action==='delete_list'){setDeleting(false);setListId('');setNotice('List deleted. Your other lists are unchanged.');}
      else if(input.action==='add'){setName('');setAdding(false);setNotice(`Added ${input.name} to ${list?.name||'your list'}.`);}
      else if(input.action==='check'||input.action==='remove')setNotice(input.action==='remove'?'Item removed.':input.done?'Marked as collected.':'Back on your list.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function compare(item:string){setDraft(`Find the best nearby deal for ${item}, considering my saved stores. Compare current prices, pack sizes and store locations, then recommend the best overall option.`);setDraftVersion(v=>v+1);screenRef.current?.scrollTo({y:0,animated:true});}
  return <Screen scrollViewRef={screenRef}><View style={s.row}><Icon name="shop" size={32}/><View style={{flex:1}}><Title>{list?list.name:offers?'Specials':'My lists'}</Title></View></View>
    {lists.length>1&&<View style={s.wrap}>{lists.map(entry=><Chip key={entry.id} title={entry.name} active={entry.id===list?.id} onPress={()=>{setListId(entry.id);setDraft('');}}/>)}</View>}
    <RetailerInvitation/><ErrorText message={error}/>{!!notice&&<View accessibilityLiveRegion="polite"><Label>{notice}</Label></View>}
    {!app.account?<Card color={C.sage}><Heading>Your pet shopping, together</Heading><Label>Tell Pip what you need. We will keep your list ready for next time.</Label><Button title="Sign in to save your list" onPress={()=>router.push('/account')}/></Card>:!list?<Card><Label>{error?'Your list could not be opened.':'Getting your list ready...'}</Label>{!!error&&<Button title="Try again" onPress={()=>{setError('');setRetry(value=>value+1);}}/>}</Card>:<>
      <PipAssistant key={draftVersion} scene="shopping" shoppingListId={list.id} initialMessage={draft||params.item&&`Find the best deal for ${params.item}${params.store?` at ${params.store} and other nearby stores`:""}.`||undefined} prompt={remaining.length?`What else do we need for ${app.selected?.name||"your pet"}?`:`What is the first item on the list for ${app.selected?.name||"your pet"}?`}/>
      <View style={s.wrap}><Button secondary title="Add without Pip" icon="plus" onPress={()=>{setAdding(true);setOffers(false);}}/><Button secondary title="Specials" icon="shop" onPress={()=>{setOffers(!offers);setAdding(false);}}/></View>
      {offers&&<ShoppingOffers onAdd={(item,retailer)=>{setName(item);setStore(retailer);setAdding(true);setOffers(false);}}/>}
      {adding&&<Card><Field label="What do you need?" value={name} onChange={setName} placeholder="Food, hay, litter, favourite treats..."/>
        <View style={s.wrap}>{['Food','Treats','Bedding','Waste bags'].map(item=><Chip key={item} title={item} onPress={()=>setName(item)}/>)}</View>
        <Field label="Store (optional)" value={store} onChange={setStore} placeholder="Any store"/>
        {!!app.account.supplies?.stores.length&&<View style={s.wrap}><Chip title="Any store" active={!store} onPress={()=>setStore('')}/>{app.account.supplies.stores.map((entry,i)=><Chip key={i} title={entry.name} active={store===entry.name} onPress={()=>setStore(entry.name)}/>)}</View>}
        <Button title="Add to this list" icon="plus" busy={busy} disabled={!name.trim()} onPress={()=>void change({action:'add',listId:list.id,name,store})}/>
        <Button secondary title="Ask Pip to compare" icon="search" disabled={!name.trim()} onPress={()=>void compare(name.trim())}/>
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
