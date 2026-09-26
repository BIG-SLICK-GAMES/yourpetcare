import React, { useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import ServiceMap from './ServiceMap';
import { api } from './api';
import { useApp } from './state';
import { Button, Card, Chip, CircleButton, ErrorText, Heading, Label, s, C } from './ui';
import type { MapPoint, WalkRoute } from './types';
type Stop='none'|'rest'|'cafe'|'friends';
type Place=MapPoint&{id:string;name:string;category:'cafe'|'park'|'dog_park';dogAccess:string;source:string;sourceName?:string;policy?:string;pupCups?:boolean;smallDogEnclosure?:boolean};
function metres(a:MapPoint,b:MapPoint){return Math.hypot((a.lat-b.lat)*111195,(a.lon-b.lon)*111195*Math.cos(a.lat*Math.PI/180));}

export default function WalkPlanner({initialMinutes,initialStop}:{initialMinutes?:number;initialStop?:string}){
  const app=useApp(),pet=app.selected,isDog=pet?.species==='Dog';
  const [minutes,setMinutes]=useState<number|undefined>(initialMinutes&&initialMinutes>=10&&initialMinutes<=120?initialMinutes:undefined);
  const [stop,setStop]=useState<Stop|undefined>(['none','rest','cafe','friends'].includes(initialStop||'')?initialStop as Stop:undefined);
  const [start,setStart]=useState<MapPoint>(),[end,setEnd]=useState<MapPoint>(),[pick,setPick]=useState<'start'|'end'>('start');
  const [places,setPlaces]=useState<Place[]>([]),[place,setPlace]=useState<Place>(),[searched,setSearched]=useState(false),[notice,setNotice]=useState(''),[manual,setManual]=useState(false);
  const [routes,setRoutes]=useState<WalkRoute[]>([]),[chosen,setChosen]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [center,setCenter]=useState<MapPoint>(); const generation=useRef(0);
  const breakMinutes=stop&&stop!=='none'?Math.min(stop==='rest'?5:10,Math.floor((minutes||20)/2)):0;
  const walk=useMemo(()=>({start,end,pick,route:routes[chosen]}),[start,end,pick,routes,chosen]);
  const candidates=useMemo(()=>{
    if(!start)return [];
    const category=stop==='cafe'?'cafe':stop==='friends'?'dog_park':'park';
    const target=Math.max(100,((minutes||20)-breakMinutes)*65/2);
    return places.filter(p=>p.category===category).sort((a,b)=>{
      const score=(p:Place)=>Math.abs(metres(p,start)-target)+(isDog&&category==='cafe'&&p.dogAccess==='unknown'?600:0);
      return score(a)-score(b);
    }).slice(0,3);
  },[places,start,stop,minutes,breakMinutes,isDog]);
  function choose(point:MapPoint){generation.current++;setRoutes([]);setError('');setPlace(undefined);if(pick==='start'){setStart(point);setEnd(undefined);setCenter(point);setPlaces([]);setSearched(false);if(manual)setPick('end');}else setEnd(point);}
  async function locate(){setError('');try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error('Location is off. Tap a starting point on the map instead.');const p=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});const point={lat:p.coords.latitude,lon:p.coords.longitude};generation.current++;setStart(point);setEnd(undefined);setCenter(point);setRoutes([]);setPlaces([]);setSearched(false);if(manual)setPick('end');}catch(e){setError((e as Error).message);}}
  async function discover(){const version=++generation.current;setBusy(true);setError('');try{const result=await api<{places:Place[];notice?:string}>('outing-stops',{start});if(version===generation.current){setPlaces(result.places);setNotice(result.notice||'');setSearched(true);}}catch(e){if(version===generation.current)setError((e as Error).message);}finally{setBusy(false);}}
  async function find(destination=end,selectedPlace?:Place){const version=++generation.current;setBusy(true);setError('');setRoutes([]);setEnd(destination);setPlace(selectedPlace);try{const result=await api<{routes:WalkRoute[]}>('walk-routes',{start,end:destination,returnToStart:true});if(version===generation.current){setRoutes(result.routes);setChosen(0);}}catch(e){if(version===generation.current)setError((e as Error).message);}finally{setBusy(false);}}
  if(!minutes)return <><Heading>How long have you got?</Heading><Label muted>A little time {pet?`with ${pet.name}`:'outside'}.</Label><View style={s.wrap}>{[10,20,30,60].map(n=><CircleButton key={n} title={`${n} min`} icon="calendar" color={C.sage} onPress={()=>setMinutes(n)}/>)}</View></>;
  if(!stop)return <><Heading>Fancy a stop along the way?</Heading><View style={s.wrap}><CircleButton title="Just a walk" icon="map" onPress={()=>setStop('none')}/><CircleButton title="A little rest" icon="tree" color={C.sage} onPress={()=>setStop('rest')}/><CircleButton title="Cafe stop" icon="food" color={C.peach} onPress={()=>setStop('cafe')}/>{(!pet||isDog)&&<CircleButton title="Puppy friends" icon="paw" color={C.gold} onPress={()=>setStop('friends')}/>}</View><Button secondary title="Change time" onPress={()=>setMinutes(undefined)}/></>;
  return <><View style={s.between}><Heading>{minutes} minutes together</Heading><Chip title="Change" onPress={()=>{generation.current++;setMinutes(undefined);setStop(undefined);setRoutes([]);}}/></View>
    <Label>{!start?'Where shall we start? Use your location or tap the map.':manual?'Tap a destination; we will include the way home.':stop==='cafe'?'Let’s find a cafe to walk to and allow time for a breather.':stop==='friends'?pet?.social==='quiet'||pet?.social==='building'?`${pet.name} prefers space. We can look for a dog park and observe from outside, or choose a quieter stop.`:'Fancy seeing whether there are some puppy friends at a nearby dog park?':'Let’s find a nearby green space and include the way home.'}</Label>
    {!!breakMinutes&&<Label small muted>Allowing {breakMinutes} min for your stop, within your {minutes} min budget.</Label>}
    <ServiceMap providers={[]} onSelect={()=>{}} center={center} walk={walk} onPick={choose}/>
    {!start&&<Button title="Start at my location" icon="map" onPress={()=>void locate()}/>}
    {start&&!manual&&<Button title={stop==='cafe'?'Find nearby cafes':stop==='friends'?'Find nearby dog parks':'Suggest nearby stops'} busy={busy} onPress={()=>void discover()}/>}
    {start&&manual&&<Button title="Map our walk and way home" disabled={!end} busy={busy} onPress={()=>void find()}/>}
    <ErrorText message={error}/>{searched&&!!notice&&!routes.length&&<Label small muted>{notice}</Label>}
    {start&&!manual&&searched&&!candidates.length&&<Label>No matching stops were found nearby. Try another kind of stop, or choose a destination yourself.</Label>}
    {!manual&&!routes.length&&candidates.map(p=><Card key={p.id}><Heading>{p.name}</Heading><Label small>{(metres(start!,p)/1000).toFixed(1)} km away in a straight line · walking time checked next</Label><Label small muted>{p.policy|| (isDog&&p.category==='cafe'?p.dogAccess==='unknown'?'Dog access is not recorded. Check with the cafe before choosing.':`Dogs listed as ${p.dogAccess==='leashed'?'welcome on lead':'allowed'} by ${p.sourceName||'OpenStreetMap'}; confirm current policy.`:'Check pet access and local rules before setting off.')}</Label>{p.smallDogEnclosure&&<Label small>Small-dog enclosure listed by council.</Label>}<Button title="Try this outing" busy={busy} onPress={()=>void find(p,p)}/><Button secondary title="Check listing" onPress={()=>void Linking.openURL(p.source)}/></Card>)}
    {routes.map((r,i)=><Card key={r.id}><Heading>{place?.name||'Your walk'}{routes.length>1?` · option ${i+1}`:''}</Heading><Label>{(r.distance/1000).toFixed(1)} km out and back · about {r.minutes+breakMinutes} min including your stop</Label><Label small muted>{r.minutes} min walking{breakMinutes?` + ${breakMinutes} min break`:''}{r.minutes+breakMinutes>minutes?`. That's ${r.minutes+breakMinutes-minutes} min over your budget; try a closer stop.`:'. Room to take it gently.'}</Label>{routes.length>1&&<Button secondary title={chosen===i?'Shown on map':'Show this route'} disabled={chosen===i} onPress={()=>setChosen(i)}/>}</Card>)}
    {!!routes.length&&<Card color={C.sage}><Heading>Before you head out</Heading><Label>{isDog?`Water, a lead and poo bags for ${pet!.name}.`:'Water and the supplies your companion normally needs.'}{stop==='cafe'&&isDog?place?.pupCups?' This cafe advertises pupaccinos. Check current availability and whether the treat suits their usual diet.':' Fancy checking for a pup cup? Ask the cafe, and stick to treats that suit their usual diet.':''}{stop==='friends'?' Give each dog space and let introductions happen at their pace. We don’t know who is there right now.':''}</Label><Button title="Add this outing to our calendar" icon="calendar" onPress={()=>router.push({pathname:'/plan',params:{outing:'yes',title:place?`Walk to ${place.name}`:'Out-and-back walk',minutes:String(Math.min(1440,routes[chosen].minutes+breakMinutes)),location:place?.name||'Chosen walking route'}})}/></Card>}
    {!!routes.length&&<Button secondary title="Try another stop" onPress={()=>{setRoutes([]);setEnd(undefined);}}/>}
    <Button secondary title={manual?'Suggest a stop instead':'Choose a destination myself'} onPress={()=>{generation.current++;setManual(!manual);setPick(start&&!manual?'end':'start');setRoutes([]);}}/>
    <Label small muted>Estimates exclude delays and sniffing stops. Foot routes do not verify pet access, seating, crowds or opening hours.</Label><Label small muted>Outside our local listings, nearby search shares your approximate start with Overpass. Routing shares your chosen points with FOSSGIS, which logs requests. Places: Brisbane City Council and linked venues. Map data © OpenStreetMap contributors; routing OSRM / FOSSGIS.</Label><Button secondary title="Fix the map" onPress={()=>void Linking.openURL('https://www.openstreetmap.org/fixthemap')}/></>;
}
