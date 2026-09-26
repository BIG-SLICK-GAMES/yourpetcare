import React, { useEffect, useMemo, useRef } from 'react';
import { MapProps, validMapPoint } from './map-props';
import { mapDocument } from './map-document';
export default function ServiceMap({providers,onSelect,center,walk,onPick}:MapProps) {
  const frame=useRef<HTMLIFrameElement>(null);const html=useMemo(()=>mapDocument(providers,center,walk),[providers,center,walk]);
  useEffect(()=>{function listen(event:MessageEvent){if(event.source!==frame.current?.contentWindow||typeof event.data!=='string')return;try{const message=JSON.parse(event.data);if(message.type==='ypc-service'&&providers.some(p=>p.id===message.id))onSelect(message.id);if(walk&&message.type==='ypc-point'&&validMapPoint(message.point))onPick?.(message.point);}catch{}}
    window.addEventListener('message',listen);return()=>window.removeEventListener('message',listen);
  },[providers,onSelect,onPick,walk]);
  return <iframe ref={frame} title="Pet services map" srcDoc={html} style={{width:'100%',height:390,border:0,borderRadius:24}} sandbox="allow-scripts allow-same-origin allow-popups"/>;
}
