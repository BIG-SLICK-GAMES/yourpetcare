import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, C, Card, Chip, CircleButton, ErrorText, Heading, Icon, Label, Screen, Title, s } from '../../ui';
import { useApp } from '../../state';
import { groups, ideas } from '../../catalog';

export default function Companion() {
  const app=useApp(); const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[consent,setConsent]=useState(false);
  const pet=app.selected, upcoming=app.account?.events.filter(e=>e.petId===pet?.id&&e.status==='planned').sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt))[0];
  async function send() {
    if (!app.account) { router.push('/account'); return; }
    setBusy(true);setError('');
    try { const proposal=await app.chat(message,consent);setMessage('');if(proposal)router.push('/review'); } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const plan=(title:string)=>router.push({pathname:'/plan',params:{title}});
  return <Screen><View style={s.between}><View><Label small muted>Your companion</Label><Label style={{fontWeight:'800'}}>Your Pet Care</Label></View><Pressable accessibilityRole="button" accessibilityLabel="Your account" onPress={()=>router.push('/account')} style={{padding:12,backgroundColor:C.peach,borderRadius:28}}><Icon name="person"/></Pressable></View>
    <View style={{gap:10}}><Title>{pet?`How’s ${pet.name}\ntoday?`:'Life with your\nfavourite companion.'}</Title>{pet?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:9}}>{app.account?.pets.map(p=><Chip key={p.id} title={p.name} active={p.id===pet.id} onPress={()=>{app.select(p.id);setError('');}}/>)}</ScrollView>:<Label muted>Big paws, tiny claws, wings and everything between.</Label>}</View>
    <Card color={C.sage}><View style={s.between}><View style={{flex:1,gap:8}}><View style={s.row}><Icon name="chat" size={21}/><Label small style={{fontWeight:'800'}}>YOUR COMPANION</Label></View><Heading>{pet?`Let’s find ${pet.name}’s kind of day.`:'Start with someone you love.'}</Heading><Label small>{pet?(pet.social==='quiet'?'A little space. A familiar place. Your pace.':'An adventure, a care check, or just a little time together.'):'Tell me about your pet. We’ll take it from there.'}</Label></View><Avatar species={pet?.species||'Dog'} size={98}/></View>{!pet&&<Button title="Meet my pet" icon="plus" onPress={()=>router.push('/pet-editor')}/>}</Card>
    {pet&&<><View style={{gap:12}}>{(app.account?.messages[pet.id]||[]).map((m,i)=><Card key={i} color={m.role==='user'?C.peach:C.card} style={{marginLeft:m.role==='user'?24:0,marginRight:m.role==='assistant'?14:0,padding:17}}><Label small muted>{m.role==='user'?'You':'Companion'}</Label><Label>{m.content}</Label></Card>)}</View>
    <Card><View style={s.between}><Heading>Talk to me</Heading><Label small muted>{app.catalog.aiAvailable?'AI ready':'AI not connected'}</Label></View><TextInput accessibilityLabel="Message your companion" value={message} onChangeText={setMessage} placeholder={`How is ${pet.name} feeling?`} placeholderTextColor={C.muted} multiline maxLength={1500} style={[s.input,{minHeight:84,textAlignVertical:'top'}]}/>
    {app.catalog.aiAvailable?<><Pressable accessibilityRole="checkbox" accessibilityState={{checked:consent}} onPress={()=>setConsent(!consent)} style={s.row}><View style={{width:26,height:26,borderRadius:7,borderWidth:1,borderColor:C.ink,backgroundColor:consent?C.ink:'transparent',alignItems:'center',justifyContent:'center'}}>{consent&&<Icon name="check" size={19} color="white"/>}</View><Label small style={{flex:1}}>Share this chat and selected pet context with AI.</Label></Pressable><Button title="Send" icon="arrow" busy={busy} disabled={!message.trim()||!consent} onPress={()=>void send()}/></>:<Label small muted>The AI connection is still being set up. You can use the plans and map below now.</Label>}
    <ErrorText message={error}/>{!!app.account?.messages[pet.id]?.length&&<Button secondary title="Clear conversation" onPress={()=>void app.clearChat().catch(e=>setError(e.message))}/>}</Card>
    {!!app.account?.proposals.length&&<Card color={C.gold}><Heading>Ready for your say</Heading>{app.account.proposals.map(p=><Button key={p.id} secondary title={p.summary} onPress={()=>{app.setActiveProposal(p);router.push('/review');}}/>)}</Card>}</>}
    <View style={s.between}><Heading>A little inspiration</Heading><Pressable accessibilityRole="link" onPress={()=>router.push('/explore')}><Label small>See all →</Label></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:13}}>{groups.map(g=><CircleButton key={g.id} title={g.name} icon={g.icon} color={g.color} onPress={()=>router.push({pathname:'/explore',params:{group:g.id}})}/>)}</ScrollView>
    {pet&&<Card color={C.peach}><View style={s.row}><Icon name="tree" size={32}/><Heading>{ideas(pet)[0]}</Heading></View><Label>A small moment together. Choose a time that suits you.</Label><Button title="Let’s plan it" onPress={()=>plan(ideas(pet)[0])}/></Card>}
    <View style={s.between}><Heading>Coming up</Heading><Pressable onPress={()=>router.push('/calendar')} accessibilityRole="link"><Label small>Calendar →</Label></Pressable></View>
    <Card>{upcoming?<><Heading>{upcoming.title}</Heading><Label>{new Date(upcoming.startAt).toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</Label></>:<Label muted>{pet?'A little room for something lovely.':'Your pet’s plans will appear here.'}</Label>}<Button secondary title="Explore the map" icon="map" onPress={()=>router.push('/map')}/></Card>
    <Label small muted>Weather and park crowd information aren’t connected yet.</Label>
  </Screen>;
}
