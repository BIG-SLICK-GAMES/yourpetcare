import { InlinePipChat } from '../InlinePipChat';
import { Pressable } from '../FeedbackPressable';
import React, { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useApp } from '../state';
import { Avatar, Button, C, Card, Chip, CircleButton, ErrorText, Field, Heading, Icon, Label, Screen, Title, s } from '../ui';
import DateField from '../DateField';
import ServiceMap from '../ServiceMap';
import { TalkingPip } from '../Pip';
import { PlanningWelcome } from '../PlanningWelcome';
import { planningCategories, PlanningCategory, PlanKind } from '../planning-categories';
const subscribeToHydration=()=>()=>{};
export default function Plan(){
  const hydrated=useSyncExternalStore(subscribeToHydration,()=>true,()=>false);
  return hydrated?<PlanningArea/>:<Screen><ActivityIndicator color={C.ink}/></Screen>;
}
function PlanningArea(){
  const app=useApp(),params=useLocalSearchParams<{title?:string;replace?:string;minutes?:string;location?:string;outing?:string;planKind?:string;planCategory?:string}>();
  const previous=params.replace&&app.activeProposal?.id===params.replace&&app.activeProposal.action==='plan'?app.activeProposal:null,data=previous?.data;
  const pet=previous?app.account?.pets.find(p=>p.id===previous.petId):app.selected;
  const prefilled=!!(params.title||params.replace||params.outing);
  const [intro,setIntro]=useState(!prefilled),[editing,setEditing]=useState(prefilled),[category,setCategory]=useState(planningCategories.find(c=>c.id===(params.planCategory||(params.outing==='yes'?'walk':'other')))||planningCategories.at(-1)!);
  const [kind,setKind]=useState<PlanKind>(['event','reminder','activity'].includes(params.planKind||'')?params.planKind as PlanKind:'activity'),[kindPicked,setKindPicked]=useState(!!params.planKind);
  const [title,setTitle]=useState(String(data?.title||params.title||'')),[when,setWhen]=useState(()=>data?.startAt?new Date(String(data.startAt)):new Date(Date.now()+3600000)),[minutes,setMinutes]=useState(String(data?.minutes||params.minutes||15)),[place,setPlace]=useState(String(data?.location||params.location||'')),[repeat,setRepeat]=useState(String(data?.repeatDays||0)),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [mapOpen,setMapOpen]=useState(false),[query,setQuery]=useState(''),[allPlaces,setAllPlaces]=useState(false),[selectedPlace,setSelectedPlace]=useState(''),[center,setCenter]=useState<{lat:number;lon:number}>(),[locating,setLocating]=useState(false);
  const [topic,setTopic]=useState(''),[chatVersion,setChatVersion]=useState(0),[moreIdeas,setMoreIdeas]=useState(false);
  const working=useRef(false);
  const [customRepeat,setCustomRepeat]=useState(false);
  const providers=useMemo(()=>app.catalog.providers.filter(p=>(allPlaces||!category.places.length||category.places.includes(p.category))&&`${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase())),[app.catalog.providers,category,allPlaces,query]);
  const chosen=providers.find(p=>p.id===selectedPlace);
  const selectPlace=useCallback((id:string)=>setSelectedPlace(id),[]);
  function chooseCategory(value:PlanningCategory){setCategory(value);setTitle(value.id==='other'?'':value.title);setMinutes(String((kindPicked?kind:value.kind)==='reminder'?5:value.minutes));setRepeat(String(value.repeat));if(!kindPicked)setKind(value.kind);setEditing(true);setAllPlaces(false);setQuery('');setSelectedPlace('');setMapOpen(false);setError('');}
  function chooseKind(value:PlanKind){setKind(value);setKindPicked(true);if(value==='reminder')setMinutes('5');else if(minutes==='5')setMinutes(String(category.minutes));}
  async function locate(){if(locating)return;setLocating(true);setError('');try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error('Location is off. You can still search or enter a place.');const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setCenter({lat:position.coords.latitude,lon:position.coords.longitude});}catch(e){setError((e as Error).message);}finally{setLocating(false);}}
  async function review(){
    if(working.current)return;
    if(!app.account){router.push('/account');return;}
    if(!pet){router.push('/pet-editor');return;}
    if(params.replace&&!previous){setError('That saved choice is no longer available. Open your current choice again.');return;}
    if(!title.trim()){setError('Give this plan a name.');return;}
    working.current=true;setBusy(true);setError('');
    try{await app.propose({action:'plan',petId:pet.id,data:{title:title.trim(),startAt:when.toISOString(),minutes:Number(minutes),location:place,repeatDays:Number(repeat)},replaceId:params.replace});router.replace({pathname:'/review',params:{planKind:kind,planCategory:category.id}});}catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  const petName=pet?.name||'your pet';
  const invitation=`What would you like to do with ${petName}?`;
  const ideas=pet?.species==='Dog'?['walk','games','parks','dinner','grooming','travel']:pet?.species==='Horse'?['training','games','grooming','habitat','travel','vet']:['games','meals','habitat','grooming','travel','vet'];
  function startIdea(value:PlanningCategory){setTopic(`I'd like help planning ${value.title.toLowerCase()} for ${petName}. Please suggest something suitable and help me work out the details.`);setChatVersion(value=>value+1);}
  if(intro)return <Screen><View testID="pip-planning-home" style={{gap:16,width:'100%',maxWidth:560,alignSelf:'center'}}>
    <Title>{pet?`${pet.name}?s plans`:'Plan with Pip'}</Title>
    {!!app.account&&app.account.pets.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{gap:8}}>{app.account.pets.map(p=><Chip key={p.id} title={p.name} active={p.id===pet?.id} onPress={()=>{app.select(p.id);setTopic('');}}/>)}</ScrollView>}
    <TalkingPip illustration={<PlanningWelcome/>} words={`${invitation} Tell me your idea, or choose a topic below. We?ll work out the details together.`} showHint={false}/>
    <View style={{borderRadius:24,backgroundColor:C.sage,padding:18,gap:8}}><Heading>{invitation}</Heading><Label>Tell me your idea. We?ll work out the details together.</Label></View>
    <InlinePipChat key={`${app.account?.id||'guest'}-${pet?.id||'welcome'}-${chatVersion}`} initialMessage={topic} welcome="Type or tap Talk to Pip to get started."/>
    <View testID="planning-inspiration" style={{gap:12}}><Heading>Need inspiration?</Heading><Label small>Here are a few ideas we can explore.</Label><View style={[s.wrap,{justifyContent:'center',gap:12}]}>{planningCategories.filter(c=>moreIdeas||ideas.includes(c.id)).map(c=><CircleButton key={c.id} title={c.title} icon={c.icon} color={c.color} onPress={()=>startIdea(c)}/>)}</View><Button secondary title={moreIdeas?'Fewer ideas':'All planning topics'} icon={moreIdeas?'close':'plus'} onPress={()=>setMoreIdeas(!moreIdeas)}/></View>
    <Button secondary title="Calendar & map" icon="map" onPress={()=>setIntro(false)}/>
  </View></Screen>;
  return <Screen wide={!editing||mapOpen} key={editing?`details-${category.id}`:mapOpen?'map':'categories'}>
    <View style={s.between}><View style={{flex:1}}><Title>{pet?`${pet.name}’s plans`:'Let’s make a plan'}</Title></View><Pressable accessibilityRole="button" accessibilityLabel="Pip’s planning welcome" onPress={()=>setIntro(true)} style={{padding:12}}><Icon name="help"/></Pressable></View>
    {!!app.account&&app.account.pets.length>1&&!previous&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>{app.account.pets.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Plan for ${p.name}`} accessibilityState={{selected:p.id===pet?.id}} onPress={()=>app.select(p.id)} style={{alignItems:'center',padding:8,borderRadius:20,borderWidth:2,borderColor:p.id===pet?.id?C.ink:'transparent'}}><Avatar species={p.species} size={40}/><Label small>{p.name}</Label></Pressable>)}</ScrollView>}
    <View style={{flexDirection:'row',justifyContent:'space-evenly',width:'100%',maxWidth:430,alignSelf:'center'}}>{([{id:'event',title:'Event',icon:'calendar',color:C.blue},{id:'reminder',title:'Reminder',icon:'bell',color:C.gold},{id:'activity',title:'Activity',icon:'play',color:C.peach}] as const).map(item=><CircleButton key={item.id} title={item.title} icon={item.icon} color={item.color} active={kind===item.id} onPress={()=>chooseKind(item.id)}/>)}</View>
    <View testID={editing&&mapOpen?"plan-map-layout":"plan-workspace"} style={{gap:20}}>
    {!editing?<View style={{gap:20}}>
      <Button secondary title={mapOpen?'Back to categories':'Find a place on the map'} icon="map" onPress={()=>setMapOpen(!mapOpen)}/>
      {!mapOpen&&<View testID="planning-groups" style={{gap:20}}>{[...new Set(planningCategories.map(c=>c.group))].map(group=><View testID="planning-group" key={group} style={{gap:12}}><Heading>{group}</Heading><View style={[s.wrap,{justifyContent:'center',gap:12}]}>{planningCategories.filter(c=>c.group===group).map(c=><CircleButton key={c.id} title={c.title} icon={c.icon} color={c.color} onPress={()=>chooseCategory(c)}/>)}</View></View>)}</View>}
    </View>:<View style={{gap:20,minWidth:0}}>
      <View style={s.between}><View style={s.row}><Icon name={category.icon} size={30}/><Heading>{category.id==='other'?'Your plan':category.title}</Heading></View><Pressable accessibilityRole="button" accessibilityLabel="Change category" onPress={()=>setEditing(false)} style={{padding:12}}><Label small>Change</Label></Pressable></View>
      <Field label={kind==='reminder'?'Remind me to…':kind==='event'?'Event name':'What shall we do?'} value={title} onChange={setTitle} placeholder={kind==='reminder'?'Give dinner, pack travel supplies…':'A little time together'}/>
      <DateField value={when} onChange={setWhen}/>
      {kind!=='reminder'&&<Field label="How many minutes?" value={minutes} onChange={setMinutes} keyboardType="number-pad"/>}
      <View style={s.row}><Icon name="bell" size={23}/><Heading>Repeat</Heading></View><View style={s.wrap}>{[['0','Once'],['1','Daily'],['7','Weekly'],['30','Every 30 days']].map(([value,label])=><Chip key={value} title={label} active={repeat===value} onPress={()=>{setRepeat(value);setCustomRepeat(false);}}/>)}<Chip title="Other interval" active={customRepeat} onPress={()=>setCustomRepeat(!customRepeat)}/></View>{(customRepeat||!['0','1','7','30'].includes(repeat))&&<Field label="Repeat every N days (0 = once)" value={repeat} onChange={setRepeat} keyboardType="number-pad"/>}
      <Field label="Place (optional)" value={place} onChange={setPlace} placeholder="At home, a cafe, your vet…"/>
      <Button secondary title={mapOpen?'Hide map':'Choose a place on the map'} icon="map" onPress={()=>setMapOpen(!mapOpen)}/>
    </View>}
    {mapOpen&&<View testID="planning-map" style={{gap:14,minWidth:0}}><View style={s.row}><Icon name="map"/><Heading>Find our place</Heading></View><Field label="Search the planning map" value={query} onChange={setQuery} placeholder="Service, suburb or postcode"/>{!!category.places.length&&<View style={s.wrap}><Chip title={`${category.title} places`} active={!allPlaces} onPress={()=>setAllPlaces(false)}/><Chip title="All places" active={allPlaces} onPress={()=>setAllPlaces(true)}/></View>}<ServiceMap providers={providers} onSelect={selectPlace} center={center}/><Button secondary title="Use my location" icon="map" busy={locating} onPress={()=>void locate()}/>
      {chosen&&<Card color={C.blue}><Heading>{chosen.name}</Heading><Label>{chosen.address||'Check the address with this provider.'}</Label><Button title="Use this place" icon="check" onPress={()=>{setPlace(`${chosen.name}${chosen.address?` — ${chosen.address}`:''}`.slice(0,300));if(!title)setTitle(`Visit ${chosen.name}`.slice(0,150));setEditing(true);setMapOpen(false);}}/></Card>}
      <Label small muted>{providers.length} directory places · Tap a pin or choose below.</Label><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>{providers.slice(0,12).map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Select ${p.name}`} onPress={()=>selectPlace(p.id)} style={{width:210,padding:15,borderRadius:20,backgroundColor:p.id===selectedPlace?C.blue:'white',borderWidth:1,borderColor:C.line}}><Heading>{p.name}</Heading><Label small>{p.address}</Label></Pressable>)}</ScrollView>
      {!providers.length&&<Card><Label>No listed places match. Try All places, another search, or enter the place yourself.</Label></Card>}
      <Label small muted>Map © OpenStreetMap contributors. Confirm pet access and bookings with the provider.</Label>
    </View>}
    </View>
    <ErrorText message={error}/>
    {editing&&<><Button title={!app.account?'Sign in to save':!pet?'Meet my pet':`Review ${kind}`} icon="calendar" busy={busy} onPress={()=>void review()}/><Label small muted>Saved to your calendar after confirmation. Enable device reminders in You for alerts. This does not book a service.</Label></>}
  </Screen>;
}
