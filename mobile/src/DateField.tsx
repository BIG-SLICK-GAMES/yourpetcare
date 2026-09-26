import React from 'react';
import { View } from 'react-native';
import { Label, C } from './ui';
export default function DateField({value,onChange}:{value:Date;onChange:(date:Date)=>void}) {
  const local = new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16);
  return <View style={{gap:8}}><Label small>When · {Intl.DateTimeFormat().resolvedOptions().timeZone}</Label><input aria-label="Date and time" type="datetime-local" value={local} onChange={event=>{const date=new Date(event.target.value);if(Number.isFinite(date.getTime()))onChange(date);}} style={{fontFamily:'Manrope',fontSize:16,padding:15,border:`1px solid ${C.line}`,borderRadius:14,color:C.ink,background:'white',minWidth:0,width:'100%',boxSizing:'border-box'}}/></View>;
}
