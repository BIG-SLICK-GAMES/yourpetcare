import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from './state';
import { categoryIcon } from './catalog';
import { Button, C, Card, Heading, Icon, Label, s } from './ui';

export function SavedPlaces(){
  const app=useApp(),stores=app.account?.supplies?.stores||[];
  const places=app.catalog.providers.filter(p=>app.account?.saved.includes(p.id));
  return <>
    <Card color={C.sage}><View style={s.row}><Icon name="shop"/><Heading>Saved stores</Heading></View>
      {stores.length?stores.map((store,i)=><View key={i} style={{gap:4}}><Heading>{store.name}</Heading>{!!store.address&&<Label small>{store.address}</Label>}{!!store.providerId&&<Button secondary title={`Open ${store.name}`} onPress={()=>router.push({pathname:'/service',params:{id:store.providerId}})}/>}</View>):<Label>Keep your local favourites close.</Label>}
      <Button secondary title="Choose my stores" icon="map" onPress={()=>router.push('/supplies')}/>
      <Button secondary title="Store specials" icon="shop" onPress={()=>router.push({pathname:'/shopping',params:{tab:'offers'}})}/>
    </Card>
    <Card color={C.blue}><View style={s.row}><Icon name="map"/><Heading>Saved locations</Heading></View>
      {places.map(p=><View key={p.id} style={s.row}><Icon name={categoryIcon(p.category)}/><View style={{flex:1}}><Button secondary title={p.name} onPress={()=>router.push({pathname:'/service',params:{id:p.id}})}/>{!!p.address&&<Label small>{p.address}</Label>}</View></View>)}
      {!places.length&&<Label>Favourite a park, cafe, vet or any place on the map.</Label>}
      <Button secondary title="Find a place to save" icon="map" onPress={()=>router.push('/map')}/>
    </Card>
  </>;
}
