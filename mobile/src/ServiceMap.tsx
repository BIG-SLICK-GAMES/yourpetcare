import React, { useEffect, useMemo, useRef } from 'react';
import { Provider } from './types';
import { mapDocument } from './map-document';
export default function ServiceMap({providers,onSelect,center}:{providers:Provider[];onSelect:(id:string)=>void;center?:{lat:number;lon:number}}) {
  const frame=useRef<HTMLIFrameElement>(null);const html=useMemo(()=>mapDocument(providers,center),[providers,center]);
  useEffect(()=>{function listen(event:MessageEvent){if(event.source!==frame.current?.contentWindow||typeof event.data!=='string')return;try{const message=JSON.parse(event.data);if(message.type==='ypc-service'&&providers.some(p=>p.id===message.id))onSelect(message.id);}catch{}}
    window.addEventListener('message',listen);return()=>window.removeEventListener('message',listen);
  },[providers,onSelect]);
  return <iframe ref={frame} title="Pet services map" srcDoc={html} style={{width:'100%',height:390,border:0,borderRadius:24}} sandbox="allow-scripts allow-same-origin allow-popups"/>;
}
