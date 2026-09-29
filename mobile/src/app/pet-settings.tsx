import React,{useCallback,useState} from 'react';
import {ActivityIndicator,View} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {useApp} from '../state';
import {Button,C,Card,ErrorText,Field,Heading,Icon,IconName,Label,Screen,Title} from '../ui';
import rawCategories from '../data/pet-settings.json';
import {Pet} from '../types';
const categories:Record<string,{title:string;icon:string;mapCategory:string|null;fields:Record<string,string>}>=rawCategories;
export default function PetSettings(){
 const app=useApp(),params=useLocalSearchParams<{id?:string;category?:string}>(),pet=app.account?.pets.find(p=>p.id===params.id);
 if(app.loading)return <Screen><ActivityIndicator color={C.ink}/></Screen>;
 if(!pet)return <Screen><Title>Pet not found</Title><Button title="My pets" onPress={()=>router.replace('/pets')}/></Screen>;
 return <Settings key={`${pet.id}-${params.category}`} pet={pet} category={params.category||'health'}/>;
}
function Settings({pet,category}:{pet:Pet;category:string}){
 const app=useApp(),select=app.select;
 useFocusEffect(useCallback(()=>{select(pet.id);},[select,pet.id]));
 const config=Object.hasOwn(categories,category)?categories[category]:undefined;
 const title=config?.title||({places:'Favourite places',reminders:'Calendar & reminders',memories:"Pip's notes"} as Record<string,string>)[category];
 const saved=pet.careSettings?.[category]||{};
 const [notes,setNotes]=useState(pet.careNotes||'');
 const [editing,setEditing]=useState(false),[values,setValues]=useState<Record<string,string>>({...saved}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const places=app.catalog.providers.filter(p=>pet.favouritePlaceIds?.includes(p.id)&&(!config?.mapCategory||p.category===config.mapCategory));
 const vet=app.catalog.providers.find(p=>p.id===pet.preferredVetId);
 const events=(app.account?.events||[]).filter(e=>e.petId===pet.id&&e.status==='planned').sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));
 function talk(draft=`Let's talk about ${pet.name}'s ${title?.toLowerCase()}.`){select(pet.id);router.push({pathname:'/pet-chat',params:{draft}});}
 async function save(){setBusy(true);setError('');try{const proposal=await app.propose(category==='memories'?{action:'update_pet',petId:pet.id,data:{...pet,careNotes:notes}}:{action:'set_pet_settings',petId:pet.id,data:{category,values}});router.push({pathname:'/review',params:{id:proposal.id}});setEditing(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function removePlace(id:string){setBusy(true);setError('');try{const proposal=await app.propose({action:'set_pet_place',petId:pet.id,data:{providerId:id,saved:false}});router.push({pathname:'/review',params:{id:proposal.id}});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!title)return <Screen><Title>Choose a care section</Title><Button title="Back to profile" onPress={()=>router.replace({pathname:'/pet-editor',params:{id:pet.id}})}/></Screen>;
 return <Screen><View style={{alignItems:'center',gap:10}}><View style={{width:66,height:66,borderRadius:33,backgroundColor:C.sage,alignItems:'center',justifyContent:'center'}}><Icon name={(config?.icon||'care') as IconName} size={32}/></View><Title center>{title}</Title><Label small muted>{pet.name}&apos;s care profile</Label></View>
  <ErrorText message={error}/>
  {editing&&(config||category==='memories')?<Card>{category==='memories'&&<Field label="Remembered care notes" value={notes} onChange={setNotes} multiline/>}{Object.entries(config?.fields||{}).map(([field,label])=><Field key={field} label={label} value={values[field]||''} onChange={value=>setValues(previous=>({...previous,[field]:value}))} multiline/>)}<Button title="Review these details" busy={busy} disabled={category!=='memories'&&!Object.keys(values).length} onPress={()=>void save()}/><Button secondary title="Cancel editing" disabled={busy} onPress={()=>setEditing(false)}/></Card>:<>
    {config&&Object.entries(config.fields).filter(([field])=>saved[field]).map(([field,label])=><Card key={field}><Label small muted style={{textAlign:'center'}}>{label}</Label><Label style={{textAlign:'center'}}>{saved[field]}</Label></Card>)}
    {config&&!Object.values(saved).some(Boolean)&&<Label style={{textAlign:'center'}}>Tell Pip what matters. We can build this up together.</Label>}
    {category==='health'&&vet&&<Card color={C.sage}><Heading center>Preferred vet</Heading><Label style={{textAlign:'center'}}>{vet.name}</Label><Button secondary title="View vet details" onPress={()=>router.push({pathname:'/service',params:{id:vet.id}})}/></Card>}
    {category==='feeding'&&pet.mealRoutine&&<Card color={C.gold}><Heading center>Meal reminders</Heading><Label style={{textAlign:'center'}}>Breakfast: {new Date(pet.mealRoutine.breakfastAt).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})}</Label><Label style={{textAlign:'center'}}>Dinner: {new Date(pet.mealRoutine.dinnerAt).toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})}</Label></Card>}
    {category==='memories'&&<Card><Label style={{textAlign:'center'}}>{pet.careNotes||'Useful things Pip remembers will appear here after you confirm them.'}</Label></Card>}
    {category==='reminders'&&<>{!events.length&&<Label style={{textAlign:'center'}}>No plans saved yet. Pip can help you arrange something.</Label>}{events.map(event=><Card key={event.id}><Heading center>{event.title}</Heading><Label style={{textAlign:'center'}}>{new Date(event.startAt).toLocaleString('en-AU')}</Label>{!!event.location&&<Label small style={{textAlign:'center'}}>{event.location}</Label>}</Card>)}<Button secondary title="Open calendar" icon="calendar" onPress={()=>router.push('/calendar')}/></>}
    {(category==='places'||!!config?.mapCategory)&&<>{!!places.length&&<Heading center>Favourite places</Heading>}{places.map(place=><Card key={place.id}><Heading center>{place.name}</Heading><Label small muted style={{textAlign:'center'}}>{place.address}</Label><Button secondary title={`View ${place.name}`} onPress={()=>router.push({pathname:'/service',params:{id:place.id}})}/><Button secondary title={`Remove ${place.name} from this profile`} busy={busy} onPress={()=>void removePlace(place.id)}/></Card>)}{category==='places'&&!places.length&&<Label style={{textAlign:'center'}}>Save favourite parks, cafes and services from the map.</Label>}<Button secondary title={category==='places'?'Choose on the map':category==='health'?'Find a vet':'Explore on the map'} icon="map" onPress={()=>router.push({pathname:'/map',params:{mode:'places',category:config?.mapCategory||''}})}/></>}
    <Button title="Talk with Pip" icon="mic" onPress={()=>talk()}/>
    {category==='feeding'&&<Button secondary title="Organise meal reminders" icon="bell" onPress={()=>talk(`Help me organise ${pet.name}'s breakfast and dinner reminders.`)}/>}
    {(config||category==='memories')&&<Button secondary title="Edit saved details" icon="care" onPress={()=>{setValues({...saved});setNotes(pet.careNotes||'');setEditing(true);}}/>}
  </>}
  <Button secondary title={`Back to ${pet.name}'s profile`} onPress={()=>router.dismissTo({pathname:'/pet-editor',params:{id:pet.id}})}/>
 </Screen>;
}
