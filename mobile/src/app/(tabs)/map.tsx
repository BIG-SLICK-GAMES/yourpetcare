import { api } from '../../api';
import { WorldLocationSearch } from '../../WorldLocationSearch';
import type { MapPoint, Provider } from '../../types';
import { mapTopicCategories, sectionTopics, SectionTopic } from '../../section-topics';
import { SectionTopicRow } from '../../SectionTopicRow';
import { directoryOrigin, nearestPlaces, kilometres } from '../../place-distance';
import { PlacePopup } from '../../PlacePopup';
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ScrollView, View } from 'react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../state';
import ServiceMap from '../../ServiceMap';
import WalkPlanner from '../../WalkPlanner';
import { Button, Card, Chip, ErrorText, Field, Heading, Icon, Label, Screen, Title, s } from '../../ui';
import { categoryIcon } from '../../catalog';
const subscribeToHydration=()=>()=>{};
export default function MapScreen() {
  const app=useApp(),params=useLocalSearchParams<{category?:string;mode?:string;minutes?:string;stop?:string}>();const [placeId,setPlaceId]=useState(''),[busy,setBusy]=useState(false),[locating,setLocating]=useState(false),[query,setQuery]=useState(''),[animal,setAnimal]=useState(''),[center,setCenter]=useState<MapPoint>(),[error,setError]=useState('');
  const hydrated=useSyncExternalStore(subscribeToHydration,()=>true,()=>false);
  const category=hydrated?params.category||'':'';
  const mode=hydrated&&params.mode==='walk'?'walk':'places';
  function chooseTopic(topic:SectionTopic){setPlaceId('');setQuery('');router.setParams(topic.title==='Walk routes'?{mode:'walk',category:''}:{mode:'places',category:mapTopicCategories[topic.title]??''});}
  const [worldPlaces,setWorldPlaces]=useState<Provider[]>([]),[searching,setSearching]=useState(false),[areaName,setAreaName]=useState(''),[limited,setLimited]=useState(false);
  const request=useRef(0);
  useEffect(()=>{
    if(!center||mode!=='places')return;
    const id=++request.current;let active=true;const timer=setTimeout(()=>{if(!active)return;setSearching(true);setError('');setWorldPlaces([]);setPlaceId('');setLimited(false);
    api<{places:Provider[];limited:boolean}>('places/search',{center,category,radius:5000}).then(result=>{if(active&&id===request.current){setWorldPlaces(result.places);setLimited(result.limited);}}).catch(e=>{if(active&&id===request.current)setError((e as Error).message);}).finally(()=>{if(active&&id===request.current)setSearching(false);});
    },350);
    return ()=>{active=false;clearTimeout(timer);};
  },[center,category,mode]);
  const selectedTopic=mode==='walk'?'Walk routes':Object.keys(mapTopicCategories).find(title=>mapTopicCategories[title]===category);
  const providers=useMemo(()=>{
    const local=center?nearestPlaces(app.catalog.providers,center).filter(p=>p.km!==null&&p.km<=5).map(p=>p.place):app.catalog.providers;
    const nearbyWorld=center?nearestPlaces(worldPlaces,center).filter(p=>p.km!==null&&p.km<=5).map(p=>p.place):[];
    return [...new Map([...local,...nearbyWorld].map(p=>[p.id,p])).values()].filter(p=>(!category||p.category===category||(category==='charity'&&p.category==='shelter'))&&(!animal||p.species_supported.includes(animal))&&`${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase()));
  },[app.catalog.providers,worldPlaces,center,category,animal,query]);
  const results=useMemo(()=>nearestPlaces(providers,center||directoryOrigin),[providers,center]);
  const chosen=providers.find(p=>p.id===placeId);
  const select=setPlaceId;
  async function favourite(id:string){if(!app.account){router.push('/account');return;}setBusy(true);setError('');try{await app.propose({action:'save_service',data:{providerId:id}});router.push('/review');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function locate(){if(locating)return;setLocating(true);setError('');try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error('Location is off. You can still search the directory.');const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setAreaName('your location');setCenter({lat:position.coords.latitude,lon:position.coords.longitude});}catch(e){setError((e as Error).message);}finally{setLocating(false);}}
  return <Screen wide><Title>Maps</Title><SectionTopicRow topics={sectionTopics("map")} onChoose={chooseTopic} selectedTopic={selectedTopic}/>{mode==='walk'?<WalkPlanner key={`${params.minutes}-${params.stop}`} initialMinutes={Number(params.minutes)||undefined} initialStop={params.stop}/>:<><WorldLocationSearch onChoose={p=>{setAreaName(p.label);setQuery('');setCenter(p);}}/><View testID="directory-map"><ServiceMap providers={providers} onSelect={select} center={center} onArea={p=>{setAreaName('this map area');setCenter(p);}}/></View><PlacePopup place={chosen} onClose={()=>setPlaceId('')}/><Button secondary title="Use my location" icon="map" busy={locating} onPress={()=>void locate()}/><Field label="Filter places" value={query} onChange={setQuery} placeholder="Place or service name"/><ScrollView horizontal contentContainerStyle={{gap:8}} showsHorizontalScrollIndicator={false}><Chip title="All animal coverage" active={!animal} onPress={()=>setAnimal('')}/>{app.catalog.species.map(sp=><Chip key={sp} title={sp} active={animal===sp} onPress={()=>setAnimal(sp)}/>)}</ScrollView><ErrorText message={error}/><Label small muted>{searching?'Finding nearby places?':center?'Worldwide directory':'Brisbane starting area'} · Animal filters show only coverage explicitly recorded by the source. Confirm suitability with the provider.</Label><View style={s.between}><Heading>{providers.length} places to explore</Heading></View><Label small muted>{center?`Within 5 km of ${areaName}. Nearest first, straight-line distances.`:'Search anywhere or use your location to find places near you.'}</Label><Button secondary title="Search this area again" busy={searching} onPress={()=>{setAreaName(areaName||'this map area');setCenter({...center||directoryOrigin});}}/>{limited&&<Label small muted>Results or listing details are limited. Choose a category to refine your search.</Label>}<View testID="directory-results" style={{gap:20}}>{results.slice(0,40).map(({place:p,km})=><Card key={p.id}><View style={s.row}><Icon name={categoryIcon(p.category)} size={30}/><View style={{flex:1}}><Heading>{p.name}</Heading><Label small>{kilometres(km)}</Label><Label small muted>{p.address||'Address details not recorded'}</Label></View></View><Button secondary title={`Explore ${p.name}`} onPress={()=>setPlaceId(p.id)}/><Button secondary title={app.account?.saved.includes(p.id)?'In your favourites':`Favourite ${p.name}`} icon="heart" busy={busy} disabled={app.account?.saved.includes(p.id)} onPress={()=>void favourite(p.id)}/></Card>)}</View>{providers.length>40&&<Label small muted>Showing the first 40 results below. All matching results are on the map; narrow your search to see more detail.</Label>}{!providers.length&&!searching&&!error&&<Card><Label>No recorded matches here. Try another category, clear the animal filter, or move the map and search again.</Label></Card>}<Label small muted>Map and directory data © OpenStreetMap contributors. Listings are not live opening-hours or booking information.</Label></>}</Screen>;
}
