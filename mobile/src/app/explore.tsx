import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { groups, categoryIcon } from '../catalog';
import { Button, C, Card, CircleButton, Field, Heading, Label, Screen, Title, s } from '../ui';
const names:Record<string,string>={park:'Parks',trainer:'Training',vet:'Vets',shop:'Food & supplies',sitter:'Sitters & walkers',boarding:'Boarding',groomer:'Grooming',shelter:'Pounds & rescue',charity:'Charities',funeral:'Farewell services',cafe:'Dining',hotel:'Stays'};
export default function Explore() {
  const params=useLocalSearchParams<{group?:string}>();const [query,setQuery]=useState('');const selected=groups.filter(g=>!params.group||g.id===params.group);
  return <Screen><Title>{selected.length===1?selected[0].name:'Discovery'}</Title>{selected.length!==1&&<Label>Ideas for your day. Help for your pet.</Label>}<Field label="What would you like to find?" value={query} onChange={setQuery} placeholder="Training, dinner, a sitter…"/>{selected.map(g=><View key={g.id} style={{gap:18}}><Heading>{g.name}</Heading><View style={[s.wrap,{gap:24}]}>{g.categories.filter(c=>names[c].toLowerCase().includes(query.toLowerCase())).map(c=><CircleButton key={c} title={names[c]} icon={categoryIcon(c)} color={g.color} onPress={()=>router.push({pathname:'/map',params:{category:c}})}/>)}</View>{g.activities.filter(a=>a.toLowerCase().includes(query.toLowerCase())).map(a=><Button key={a} secondary title={`Plan ${a.toLowerCase()}`} onPress={()=>router.push({pathname:'/plan',params:{title:a}})}/>)}</View>)}<Card color={C.sage}><Heading>Can’t find it?</Heading><Label>Try another category or search the map.</Label><Button title="Explore map" icon="map" onPress={()=>router.push('/map')}/></Card><Card style={{borderStyle:'dashed'}}><Label small muted>ADVERTISING SPACE</Label><Label small>Reserved for clearly labelled partner placements. No advertising network is active.</Label></Card></Screen>;
}
