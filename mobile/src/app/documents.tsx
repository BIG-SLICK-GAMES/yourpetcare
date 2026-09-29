import React from 'react';
import {router} from 'expo-router';
import {useApp} from '../state';
import {Button,Card,Heading,Label,Screen,Title} from '../ui';
export default function Documents(){
 const app=useApp(),docs=(app.account?.documents||[]).filter(d=>d.petId===app.selected?.id);
 return <Screen><Title>{app.selected?.name||'Pet'} documents</Title>{docs.map(d=><Card key={d.id}><Heading>{d.title}</Heading><Label>{d.category}</Label><Label small>Document reference recorded. File viewing is not connected yet.</Label></Card>)}{!docs.length&&<Card><Heading>Keep important care details together</Heading><Label>File uploads are not connected yet. You can save vet instructions, insurance and microchip details in the care profile.</Label><Button title="Open care profile" onPress={()=>app.selected?router.push({pathname:'/pet-editor',params:{id:app.selected.id}}):router.push('/pets')}/></Card>}</Screen>;
}
