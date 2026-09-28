import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { TalkingPip } from './Pip';
import { Avatar, Button, C, Heading, Icon, type IconName, Label, s } from './ui';

type Frame={say:string;screen:string;example:string;button:string;result:string;icon:IconName};
export type HelpFilm={id:string;title:string;icon:IconName;color:string;href:Href;frames:Frame[]};
export const helpFilms:HelpFilm[]=[
  {id:'about',title:'About Your Pet Care',icon:'heart',color:C.sage,href:{pathname:'/',params:{mode:'chat'}},frames:[
    {say:'You give your pets so much love. We see it, and we appreciate you. Your Pet Care exists because pet parents deserve a little care, too.',screen:'For the people who love them',example:'You care for them. We care about you.',button:'',result:'That is why we are here.',icon:'heart'},
    {say:'If life has got a little out of hand, that is okay. No judgement. Let us take one small step to help you and your pet today.',screen:'Busy days. Hard days. All welcome.',example:'You do not have to remember it all.',button:'',result:'A little help, at your pace.',icon:'care'},
    {say:'I am Pip, your extra helper. We can keep pet details together, plan an outing, find local help and set care reminders. You choose what we save.',screen:'Share the remembering',example:'Meals. Walks. Vet details. Time together.',button:'',result:'You choose. I help you follow through.',icon:'calendar'},
    {say:'Stuck for ideas? Let us discover something together. Find activities, local help and pet-friendly places, or bring your pet-care questions to Pip. A starting point for all things pet care.',screen:'Discovery starts with curiosity',example:'Fresh ideas. Helpful information. New adventures.',button:'',result:'Find what fits your pet and your day.',icon:'search'},
    {say:'More room for the good moments, and a little less to keep in your head. We are a team now. Let us make remembering a thing to forget.',screen:'More time for the love',example:'Making remembering a thing to forget :)',button:'',result:'Your Pet Care. Here for both of you.',icon:'paw'}]},
  {id:'pets',title:'Meet your pet',icon:'paw',color:C.gold,href:'/',frames:[
    {say:'Start with their name. I’ll ask one little question at a time.',screen:'Meet your companion',example:'Stormy',button:'Next',result:'Hello, Stormy!',icon:'paw'},
    {say:'Tap their kind of pet. That is all we need to get started.',screen:'Getting to know you',example:'Dog · Meals & reminders',button:'Meals & reminders',result:'Let’s make meal times easier.',icon:'paw'},
    {say:'Sign in, meet Pip with your pet, then tap Save. We can learn the rest together.',screen:'Your choice',example:'Stormy’s profile',button:'Save Stormy',result:'Saved in My pets',icon:'check'}]},
  {id:'talk',title:'Talk with Pip',icon:'mic',color:C.sage,href:'/',frames:[
    {say:'Sign in, then type a message—or tap the microphone.',screen:'Companion',example:'Help us plan our day',button:'Send message',result:'Let’s plan something together.',icon:'chat'},
    {say:'You choose whether to share your message with AI first.',screen:'Your permission',example:'Messages and selected pet details',button:'Allow & continue',result:'Your conversation can begin.',icon:'check'},
    {say:'Turn sound on to hear me. Tap the microphone to talk back.',screen:'A conversation, your way',example:'Something quiet for Stormy',button:'Turn spoken replies on',result:'One question at a time.',icon:'sound'}]},
  {id:'meals',title:'Meal reminders',icon:'food',color:C.peach,href:'/',frames:[
    {say:'Ask me to help remember breakfast and dinner.',screen:'Tell Pip',example:'Help me remember meal times',button:'Send message',result:'What time is breakfast?',icon:'food'},
    {say:'Tell me the times. Check my suggestion before you confirm.',screen:'Example meal routine',example:'Breakfast 7 am · Dinner 6 pm',button:'Confirm',result:'Two daily plans saved',icon:'calendar'},
    {say:'On your phone, enable device reminders in Calendar and allow notifications.',screen:'Calendar',example:'Breakfast for Stormy · 7 am',button:'Enable device reminders',result:'Browser preview: calendar only',icon:'calendar'}]},
  {id:'walk',title:'A little adventure',icon:'map',color:C.blue,href:{pathname:'/map',params:{mode:'walk'}},frames:[
    {say:'Choose Walking routes on Map. How much time have you got?',screen:'How long have you got?',example:'20 minutes together',button:'20 min',result:'Time for a gentle outing.',icon:'map'},
    {say:'Fancy a cafe or a rest? Pick a stop, then your starting point.',screen:'A stop along the way',example:'Cafe stop · Start at my location',button:'Find nearby cafes',result:'Choose a place that suits your pet.',icon:'food'},
    {say:'Check the route and break time. Add it to your calendar if you like.',screen:'Your outing',example:'Walk + cafe break',button:'Add to our calendar',result:'Choose a date and confirm',icon:'calendar'}]},
  {id:'places',title:'Find extra help',icon:'heart',color:C.lavender,href:'/map',frames:[
    {say:'Use the map to find vets, sitters, parks and more.',screen:'Care Around You',example:'Vets near your suburb',button:'Vets',result:'Matching places on the map',icon:'map'},
    {say:'Open a listing. Check who it suits and contact the provider.',screen:'Example vet listing',example:'Animal coverage · Contact details',button:'Explore this place',result:'Confirm details with the provider',icon:'heart'},
    {say:'Save a place for later. You’ll find it under You.',screen:'Keep it handy',example:'Your favourite vet',button:'Save this place',result:'Saved places · You',icon:'check'}]},
  {id:'choices',title:'You’re in charge',icon:'check',color:C.sage,href:'/',frames:[
    {say:'I suggest a change and show you exactly what it means.',screen:'Pip’s suggestion',example:'A reminder for tomorrow',button:'Review',result:'Nothing saved yet',icon:'chat'},
    {say:'Something off? Choose Change—or Cancel to leave things as they are.',screen:'Your choice',example:'Let’s make that afternoon',button:'Change',result:'Check the updated suggestion',icon:'calendar'},
    {say:'Confirm only when it feels right. I’ll tell you what was saved.',screen:'Ready when you are',example:'Your updated plan',button:'Confirm',result:'Saved in your calendar',icon:'check'}]},
  {id:'plans',title:'Plan your day',icon:'calendar',color:C.gold,href:'/calendar',frames:[
    {say:'Open Calendar and choose Plan something. Pick the pet it’s for.',screen:'Planning',example:'Something together',button:'Activities',result:'Choose your companion',icon:'calendar'},
    {say:'Pick an icon. I will fill in a starting idea; you choose the time and any changes.',screen:'A little plan',example:'Grooming time · Saturday',button:'Review plan',result:'Your choice is ready to check',icon:'calendar'},
    {say:'Confirm to add it. Afterwards, mark it complete in Calendar.',screen:'Coming up',example:'Grooming time together',button:'Mark complete',result:'Find it under Completed',icon:'check'}]},
  {id:'privacy',title:'Your space & data',icon:'person',color:C.lavender,href:'/account',frames:[
    {say:'Open You for your account and the places you’ve saved.',screen:'Your space',example:'Your pets · Saved places',button:'You',result:'Your little team, together',icon:'person'},
    {say:'Want a copy of your information? Choose Export my data.',screen:'Your information',example:'Pet profiles, plans and conversations',button:'Export my data',result:'Download or share your copy',icon:'check'},
    {say:'Read Privacy for sharing details. Account deletion asks for your password.',screen:'Your data, your say',example:'You choose what to share',button:'Privacy & your data',result:'You stay in control',icon:'person'}]},
  {id:'support',title:'A helping paw',icon:'care',color:C.peach,href:'/account',frames:[
    {say:'Connection trouble? Open You and tap Check connection.',screen:'You',example:'Companion connection',button:'Check connection',result:'Try again when you’re online',icon:'chat'},
    {say:'Can’t use the microphone? You can always type instead.',screen:'Companion',example:'Can we type for now?',button:'Send message',result:'Of course. I’m right here.',icon:'chat'},
    {say:'Missing a nudge? Check phone permissions and reopen Calendar.',screen:'On your phone',example:'Allow notifications',button:'Enable device reminders',result:'Open the app regularly to refresh',icon:'calendar'}]},
];

export function AnimatedHelp({film,onClose}:{film:HelpFilm;onClose:()=>void}){
  const [step,setStep]=useState(0),[manual,setManual]=useState(true),[paused,setPaused]=useState(false),[active,setActive]=useState(true);
  useEffect(()=>{let alive=true;void Promise.all([AccessibilityInfo.isReduceMotionEnabled(),Platform.OS==='web'?Promise.resolve(false):AccessibilityInfo.isScreenReaderEnabled()]).then(([reduced,reader])=>{if(alive)setManual(reduced||reader);}).catch(()=>{});const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',()=>setManual(true));const reader=AccessibilityInfo.addEventListener('screenReaderChanged',()=>setManual(true));const state=AppState.addEventListener('change',value=>setActive(value==='active'));return()=>{alive=false;motion.remove();reader.remove();state.remove();};},[]);
  useEffect(()=>{if(manual||paused||!active||step===film.frames.length-1)return;const timer=setTimeout(()=>setStep(n=>Math.min(film.frames.length-1,n+1)),film.id==='about'?11000:6500);return()=>clearTimeout(timer);},[manual,paused,active,step,film]);
  const frame=film.frames[step];
  function tryIt(){onClose();router.navigate(film.href);}
  return <SafeAreaView style={styles.screen}><View style={[s.between,styles.top]}><Label small style={{flex:1}}>{film.title} · {step+1} / {film.frames.length}</Label><Button secondary title="Close guide" onPress={onClose}/></View>
    <ScrollView contentContainerStyle={styles.content}><View style={styles.pip}><TalkingPip size={64} words={frame.say} active={active} onListen={()=>setPaused(true)}/><View style={styles.bubble} accessibilityLiveRegion="polite"><Label style={{fontSize:17,lineHeight:25}}>{frame.say}</Label></View></View>
      <Demo key={`${film.id}-${step}`} film={film} frame={frame} still={manual||paused||!active}/>
    </ScrollView>
    <View style={styles.controls}><View style={s.row}>{step>0&&<View style={{flex:1}}><Button secondary title="Previous scene" onPress={()=>{setStep(n=>Math.max(0,n-1));setPaused(true);}}/></View>}<View style={{flex:1}}>{step<film.frames.length-1?<Button title="Next scene" onPress={()=>setStep(n=>Math.min(film.frames.length-1,n+1))}/>:<Button title={film.id==='about'?'Talk to Pip':'Let’s try it'} icon={film.icon} onPress={tryIt}/>}</View></View>{film.id==='about'&&step===film.frames.length-1&&<Button secondary title="Discover ideas & places" icon="search" onPress={()=>{onClose();router.navigate('/explore');}}/>}{!manual&&<Button secondary title={paused?'Play guide':'Pause guide'} onPress={()=>setPaused(!paused)}/>}<Label small muted style={{textAlign:'center'}}>{film.id==='about'?'A little help, every day.':'Demonstration only · you choose what to save'}</Label></View>
  </SafeAreaView>;
}

function Demo({film,frame,still}:{film:HelpFilm;frame:Frame;still:boolean}){
  const [motion]=useState(()=>new Animated.Value(0)),[typed,setTyped]=useState('');
  useEffect(()=>{motion.setValue(still?1:0);if(still)return;const animation=Animated.timing(motion,{toValue:1,duration:3800,useNativeDriver:true,isInteraction:false});animation.start();return()=>animation.stop();},[motion,still]);
  useEffect(()=>{if(still)return;let n=0;const timer=setInterval(()=>{n+=2;setTyped(frame.example.slice(0,n));if(n>=frame.example.length)clearInterval(timer);},55);return()=>clearInterval(timer);},[frame,still]);
  const opacity=motion.interpolate({inputRange:[0,.6,.8,1],outputRange:[0,0,1,1]});
  if(film.id==='about')return <View style={[styles.demo,{backgroundColor:film.color,gap:20,alignItems:'center'}]}>
    <View style={{alignItems:'center'}}><Heading>{frame.screen}</Heading></View>
    <View style={{flexDirection:'row',alignItems:'center',gap:18,paddingVertical:12}}>{(['person',frame.icon,'paw'] as IconName[]).map((icon,i)=><Animated.View key={i} style={{padding:i===1?20:12,borderRadius:60,backgroundColor:i===1?'white':C.paper,transform:[{translateY:motion.interpolate({inputRange:[0,1],outputRange:[i===1?12:-12,0]})},{scale:motion.interpolate({inputRange:[0,1],outputRange:[.85,1]})}]}}><Icon name={icon} size={i===1?48:28}/></Animated.View>)}</View>
    <Label style={{textAlign:'center',fontSize:22,lineHeight:30,fontWeight:'800'}}>{frame.example}</Label>
    <Animated.View style={{opacity}}><Label style={{textAlign:'center'}}>{frame.result}</Label></Animated.View>
  </View>;
  return <View style={[styles.demo,{backgroundColor:film.color}]} accessibilityLabel={`Example: ${frame.example}. ${frame.result}`} accessible>
    <View style={[s.between,{marginBottom:20}]}><Label small muted>EXAMPLE</Label><Icon name={film.icon}/></View><Heading>{frame.screen}</Heading>
    {film.id==='pets'?<View style={{alignItems:'center',padding:12}}><Avatar species="Dog" size={88}/></View>:film.id==='walk'||film.id==='places'?<View style={styles.map}><Svg width="100%" height={108} viewBox="0 0 280 108"><Path d="M0 34H280M0 78H280M45 0V108M140 0V108M234 0V108" stroke="#c4d4be" strokeWidth="9"/><Path d="M45 78Q95 78 140 34H234" stroke={C.ink} strokeWidth="4" strokeDasharray="6 5" fill="none"/><Circle cx="45" cy="78" r="7" fill={C.ink}/><Circle cx="234" cy="34" r="9" fill={C.rust}/></Svg><Animated.View style={{position:'absolute',top:45,left:'30%',opacity,transform:[{translateX:motion.interpolate({inputRange:[0,1],outputRange:[-28,38]})}]}}><Icon name="paw" size={25}/></Animated.View></View>:<View style={{alignItems:'center',padding:22}}><Animated.View style={{transform:[{scale:motion.interpolate({inputRange:[0,.3,.6,1],outputRange:[.85,1,.95,1]})}]}}><Icon name={frame.icon} size={64}/></Animated.View></View>}
    <View style={styles.sample}><Label style={{fontSize:17}}>{still?frame.example:typed||' '}</Label></View>
    <View style={styles.fakeButton}><Label style={{color:'white',fontWeight:'700',textAlign:'center'}}>{frame.button}</Label><Animated.View style={[styles.tap,{opacity:motion.interpolate({inputRange:[0,.3,.5,.7,1],outputRange:[0,0,1,0,0]}),transform:[{scale:motion.interpolate({inputRange:[0,.5,.7,1],outputRange:[.6,1.25,.6,.6]})}]}]}/></View>
    <Animated.View style={[styles.result,{opacity}]}><Icon name="check" size={20}/><Label small style={{flex:1}}>{frame.result}</Label></Animated.View>
  </View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:C.paper},top:{paddingHorizontal:20,paddingVertical:10,width:'100%',maxWidth:620,alignSelf:'center'},content:{padding:18,gap:18,width:'100%',maxWidth:540,alignSelf:'center',flexGrow:1,justifyContent:'center'},pip:{alignItems:'center',gap:12},bubble:{padding:18,borderRadius:22,backgroundColor:'white',width:'100%',borderWidth:1,borderColor:C.line},demo:{padding:18,borderRadius:30,width:'100%'},sample:{backgroundColor:'white',padding:16,borderRadius:16,minHeight:58,justifyContent:'center'},fakeButton:{backgroundColor:C.ink,borderRadius:16,padding:16,marginTop:12,alignItems:'center',justifyContent:'center'},tap:{position:'absolute',right:24,width:40,height:40,borderRadius:20,borderWidth:4,borderColor:C.gold,backgroundColor:'#f0e4bb55'},result:{flexDirection:'row',alignItems:'center',gap:8,paddingTop:16,minHeight:44},map:{height:108,marginVertical:14,borderRadius:18,backgroundColor:'#eef2e5',overflow:'hidden'},controls:{paddingHorizontal:22,paddingBottom:14,paddingTop:8,gap:8,width:'100%',maxWidth:540,alignSelf:'center'}});
