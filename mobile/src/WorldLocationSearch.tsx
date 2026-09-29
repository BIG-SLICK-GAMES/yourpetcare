import React,{useState} from 'react';
import {View} from 'react-native';
import {api} from './api';
import type {MapPoint} from './types';
import {Button,ErrorText,Field,Label} from './ui';
export type WorldLocation=MapPoint&{label:string};
export function WorldLocationSearch({onChoose}:{onChoose:(place:WorldLocation)=>void}){
 const [query,setQuery]=useState(''),[matches,setMatches]=useState<WorldLocation[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(false);
 async function search(){if(busy)return;setBusy(true);setError('');setMatches([]);setSearched(false);try{const result=await api<{locations:WorldLocation[]}>('places/geocode',{query});setMatches(result.locations);setSearched(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <View style={{gap:10}}><Field label="Search anywhere" value={query} onChange={value=>{setQuery(value);setMatches([]);setSearched(false);}} placeholder="Town, city, address or country"/><Button secondary title="Find location" icon="search" busy={busy} disabled={query.trim().length<2} onPress={()=>void search()}/><ErrorText message={error}/>{matches.map((p,i)=><Button key={`${p.lat}:${p.lon}:${i}`} secondary title={p.label} onPress={()=>{setMatches([]);setSearched(false);onChoose(p);}}/>)}{searched&&!matches.length&&<Label small>No location found. Try adding the country or region.</Label>}</View>;
}
