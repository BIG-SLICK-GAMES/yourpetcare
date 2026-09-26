import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { Linking, View } from 'react-native';
import { MapProps, validMapPoint } from './map-props';
import { mapDocument } from './map-document';
export default function ServiceMap({providers,onSelect,center,walk,onPick}:MapProps) {
  const html=useMemo(()=>mapDocument(providers,center,walk),[providers,center,walk]);
  return <View style={{height:390,borderRadius:24,overflow:'hidden'}}><WebView source={{html}} originWhitelist={['about:*']} javaScriptEnabled onMessage={event=>{try{const message=JSON.parse(event.nativeEvent.data);if(message.type==='ypc-service'&&providers.some(p=>p.id===message.id))onSelect(message.id);if(walk&&message.type==='ypc-point'&&validMapPoint(message.point))onPick?.(message.point);}catch{}}} onShouldStartLoadWithRequest={request=>{if(request.url==='about:blank')return true;if(request.isTopFrame&&request.url.startsWith('https://www.openstreetmap.org/'))void Linking.openURL(request.url);return false;}}/></View>;
}
