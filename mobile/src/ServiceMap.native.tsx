import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { Linking, View } from 'react-native';
import { Provider } from './types';
import { mapDocument } from './map-document';
export default function ServiceMap({providers,onSelect,center}:{providers:Provider[];onSelect:(id:string)=>void;center?:{lat:number;lon:number}}) {
  const html=useMemo(()=>mapDocument(providers,center),[providers,center]);
  return <View style={{height:390,borderRadius:24,overflow:'hidden'}}><WebView source={{html}} originWhitelist={['about:*']} javaScriptEnabled onMessage={event=>{try{const message=JSON.parse(event.nativeEvent.data);if(message.type==='ypc-service'&&providers.some(p=>p.id===message.id))onSelect(message.id);}catch{}}} onShouldStartLoadWithRequest={request=>{if(request.url==='about:blank')return true;if(request.isTopFrame&&request.url.startsWith('https://www.openstreetmap.org/'))void Linking.openURL(request.url);return false;}}/></View>;
}
