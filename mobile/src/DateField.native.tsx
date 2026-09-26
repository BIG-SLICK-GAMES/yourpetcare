import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Label } from './ui';
export default function DateField({value,onChange}:{value:Date;onChange:(date:Date)=>void}) {
  const [mode,setMode]=useState<'date'|'time'|null>(null);
  return <View style={{gap:10}}><Label small>When · {Intl.DateTimeFormat().resolvedOptions().timeZone}</Label><Button secondary title={value.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'})} onPress={()=>setMode('date')}/><Button secondary title={value.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'})} onPress={()=>setMode('time')}/>{mode&&<><DateTimePicker value={value} mode={mode} minimumDate={mode==='date'?new Date():undefined} display={Platform.OS==='ios'?'spinner':'default'} onChange={(event,date)=>{if(Platform.OS==='android')setMode(null);if(event.type!=='dismissed'&&date)onChange(date);}}/>{Platform.OS==='ios'&&<Button title="Done" onPress={()=>setMode(null)}/>}</>}</View>;
}
