import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../state';
import { RememberSignIn, useRememberSignIn } from '../../RememberSignIn';
import { api } from '../../api';
import { Button, C, Card, ErrorText, Field, Heading, Label, Screen, Title, s } from '../../ui';
export default function AccountScreen() {
  const app=useApp();const [signup,setSignup]=useState(false),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState(false),[deletePassword,setDeletePassword]=useState('');
  const login=useRememberSignIn(setUsername,setSignup,app.account?.id);
  async function run(action:()=>Promise<void>){setError('');setBusy(true);try{await action();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function authenticate(){await app.authenticate(username.trim(),password,signup,login.remember);setPassword('');if(router.canGoBack())router.back();else router.replace('/');}
  async function exportData(){const data=await api('export');const json=JSON.stringify(data,null,2);if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='your-pet-care.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}else await Share.share({message:json,title:'Your Pet Care data'});}
  const [viewportHeight,setViewportHeight]=useState<number>();
  useEffect(()=>{
    if(Platform.OS!=='web')return;
    const viewport=window.visualViewport;
    const resize=()=>setViewportHeight(viewport?.height||window.innerHeight);
    resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);
    return()=>{viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);};
  },[]);
  if(!app.account)return <SafeAreaView edges={['top','left','right','bottom']} style={[s.screen,Platform.OS==='web'&&viewportHeight?{height:viewportHeight,flex:undefined}:undefined]}>
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,minHeight:0}}>
      <View testID="signin-frame" style={{flex:1,minHeight:0,width:'100%',maxWidth:440,alignSelf:'center',paddingHorizontal:22,paddingVertical:12,gap:10}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><View style={{flex:1}}><Heading>{signup?'Create account':'Welcome back'}</Heading></View><Pressable accessibilityRole="button" accessibilityLabel="Go home" onPress={()=>router.replace('/home')} style={{minHeight:44,minWidth:64,justifyContent:'center',alignItems:'center',backgroundColor:C.sage,borderRadius:18}}><Label small>Home</Label></Pressable></View>
        <ScrollView testID="signin-fields" keyboardShouldPersistTaps="handled" style={{flex:1,minHeight:0}} contentContainerStyle={{flexGrow:1,justifyContent:'center',gap:8}}>
          <Field autoComplete="username" label="Username" value={username} onChange={setUsername} placeholder="Your sign-in name"/>
          <Field autoComplete={signup?'new-password':'current-password'} label="Password" value={password} onChange={setPassword} secure placeholder={signup?'At least 12 characters':'Your password'}/>
          <RememberSignIn value={login.remember} onChange={login.setRemember}/>
          <ErrorText message={error}/>
        </ScrollView>
        <View testID="signin-actions" style={{flexShrink:0,gap:6}}>
          <Button title={signup?'Create account':'Sign in'} busy={busy} disabled={!username.trim()||!password} onPress={()=>void run(authenticate)}/>
          <Pressable accessibilityRole="button" accessibilityLabel={signup?'I already have an account':'Create account'} disabled={busy} onPress={()=>{setSignup(!signup);setError('');}} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Label small>{signup?'I already have an account':'New here? Create account'}</Label></Pressable>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}><Pressable accessibilityRole="button" accessibilityLabel="Help & tutorials" onPress={()=>router.push('/help')} style={{minHeight:44,minWidth:60,justifyContent:'center'}}><Label small>Help</Label></Pressable>{login.saved&&<Pressable accessibilityRole="button" accessibilityLabel="Forget saved sign-in name" onPress={()=>void run(login.forget)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}><Label small>Forget name</Label></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Privacy & your data" onPress={()=>router.push('/privacy')} style={{minHeight:44,minWidth:60,justifyContent:'center',alignItems:'flex-end'}}><Label small>Privacy</Label></Pressable></View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
  const reassurance=<Card><Heading>We&apos;re a team.</Heading><Label>Life gets busy, and sometimes it gets hard. That&apos;s okay. You don&apos;t have to remember everything on your own. We&apos;re here to help make caring for {app.selected?.name||'your pets'} a little easier, one day at a time.</Label></Card>;
  return <Screen><Title>Your space</Title>{reassurance}<ErrorText message={error}/>{app.notice&&<Label>{app.notice}</Label>}<><Card><Heading>{app.account.username}</Heading><Label>{app.account.pets.length} companions · {app.account.events.filter(e=>e.status==='planned').length} upcoming plans</Label><Button secondary title="Sign out" busy={busy} onPress={()=>void run(app.logout)}/></Card><Card><Heading>Supplies & savings</Heading><Label>{app.account.supplies?.stores.length?app.account.supplies.stores.map(s=>s.name).join(', '):'Keep your local pet shop and favourite supplies stores here.'}</Label><Button secondary title="My supplies stores" icon="food" onPress={()=>router.push('/supplies')}/></Card><Heading>Favourite places</Heading>{app.catalog.providers.filter(p=>app.account!.saved.includes(p.id)).map(p=><Button key={p.id} secondary title={p.name} onPress={()=>router.push({pathname:'/service',params:{id:p.id}})}/>)}{!app.account.saved.length&&<Label muted>Tap a place on the map and favourite it to keep it here.</Label>}<Button secondary title="Clear current conversation" onPress={()=>void run(app.clearChat)}/><Button secondary title="Export my data" onPress={()=>void run(exportData)}/>{!deleting?<Button secondary title="Delete my account" onPress={()=>setDeleting(true)}/>:<Card><Heading>Delete this account?</Heading><Label>This permanently removes this mobile account, pets, plans, saved places and conversations.</Label><Field label="Confirm your password" value={deletePassword} onChange={setDeletePassword} secure/><Button title="Permanently delete account" busy={busy} onPress={()=>void run(async()=>{await app.remove(deletePassword);setDeletePassword('');setDeleting(false);})}/><Button secondary title="Keep my account" onPress={()=>setDeleting(false)}/></Card>}</>
  <Card><Heading>Companion connection</Heading><Label>{app.catalog.aiAvailable?'Your companion is connected. You choose when to share a message with AI.':'Live conversation is unavailable right now. Your plans and places are still here.'}</Label><Label small muted>{app.online?'App service connected.':'Browsing the bundled directory. The app service is not connected.'}</Label><Button secondary title="Check connection" onPress={()=>void run(app.refresh)}/></Card><Button secondary title="Help & tutorials" icon="help" onPress={()=>router.push('/help')}/><Button secondary title="Privacy & your data" onPress={()=>router.push('/privacy')}/><Label small muted>Mobile development build · not yet submitted to either app store.</Label></Screen>;
}
