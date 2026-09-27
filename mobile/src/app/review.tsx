import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state';
import { Button, C, Card, ErrorText, Heading, Icon, Label, Screen, Title } from '../ui';
export default function Review() {
  const app=useApp(), proposal=app.activeProposal;const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const params=useLocalSearchParams<{planKind?:string;planCategory?:string}>();
  const [clock,setClock]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),15000);return()=>clearInterval(timer);},[]);
  async function decide(value:'confirm'|'cancel'){if(!proposal)return;setBusy(true);setError('');try{await app.decide(proposal.id,value);}catch(e){setError((e as Error).message);}finally{setBusy(false);} }
  if(!proposal)return <Screen><Title>No choice waiting</Title><Button title="Back to companion" onPress={()=>router.replace('/')}/></Screen>;
  const pending=proposal.status==='pending', expired=Date.parse(proposal.expiresAt)<=clock;
  function change(){if(!proposal)return; if(proposal.action==='plan')router.push({pathname:'/plan',params:{replace:proposal.id,planKind:params.planKind,planCategory:params.planCategory}});else if(['add_pet','update_pet'].includes(proposal.action))router.push({pathname:'/pet-editor',params:{id:proposal.petId||'',replace:proposal.id}});else{app.setNotice('Cancel this choice, then choose another service or event.');router.back();}}
  return <Screen><View style={{alignSelf:'flex-start',padding:18,borderRadius:40,backgroundColor:C.sage}}><Icon name={proposal.status==='confirmed'?'check':'chat'} size={34}/></View><Title>{proposal.status==='confirmed'?'All yours.':proposal.status==='cancelled'?'No changes made.':expired?'This choice expired.':'Does this feel right?'}</Title><Card><Heading>{proposal.summary}</Heading>{proposal.details.map(([label,value],i)=><View key={i} style={{gap:3}}><Label small muted>{label}</Label><Label>{['When','Breakfast','Dinner'].includes(label)?new Date(value).toLocaleString('en-AU'):value}</Label></View>)}</Card>{!!proposal.report&&<Label>{proposal.report}</Label>}<ErrorText message={error}/>{pending&&!expired?<><Label small muted>Nothing changes until you confirm. This choice is available for 30 minutes.</Label><Button title="Confirm" icon="check" busy={busy} onPress={()=>void decide('confirm')}/>{['plan','add_pet','update_pet'].includes(proposal.action)&&<Button secondary title="Change" disabled={busy} onPress={change}/>}<Button secondary title="Cancel" disabled={busy} onPress={()=>void decide('cancel')}/></>:<Button title={proposal.status==='confirmed'&&['plan','complete_event'].includes(proposal.action)?'See my calendar':'Back to companion'} onPress={()=>router.replace(proposal.status==='confirmed'&&['plan','complete_event'].includes(proposal.action)?'/calendar':'/')}/>}</Screen>;
}
