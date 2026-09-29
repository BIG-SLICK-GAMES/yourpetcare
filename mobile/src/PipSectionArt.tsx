import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { PipDrawing } from './Pip';
import { PetFace } from './PipPetWelcome';
import { C } from './ui';

export type PipSectionScene='shopping'|'activities'|'calendar'|'map'|'pets'|'help'|'you'|'supplies'|'discover'|'care';
export const sceneDescription:Record<PipSectionScene,string>={
  shopping:'Pip carrying a basket of pet goodies',activities:'Pip playing with your pet',calendar:'Pip organising a colourful calendar',map:'Pip exploring with a map and a backpack',pets:'Pip sharing a cuddle with your pet',help:'Pip opening an illustrated guidebook',you:'Pip offering a heart and a helping hand',supplies:'Pip packing a box of pet supplies',discover:'Pip discovering a trail with a magnifying glass',care:'Pip wearing a stethoscope beside a care bag',
};
const heart=(x:number,y:number,scale=1)=><G transform={`translate(${x} ${y}) scale(${scale})`}><Path d="M0 8C-16-9-32 12-15 26L0 39 15 26C32 12 16-9 0 8Z" fill={C.peach} stroke={C.ink} strokeWidth="2.5"/></G>;

// Section illustrations share Pip's original vector drawing, colours and outlines.
export function PipSectionArt({scene,species='Dog',petName}:{scene:PipSectionScene;species?:string;petName?:string}){
  const companion=scene==='activities'||scene==='pets';
  const pose=scene==='activities'?'celebrate':scene==='map'||scene==='discover'?'point':scene==='you'?'wave':'hold';
  const tint=scene==='shopping'||scene==='supplies'?C.peach:scene==='calendar'||scene==='help'?C.lavender:scene==='map'||scene==='discover'?C.blue:C.sage;
  const description=companion?`Pip ${scene==='pets'?'cuddling':'playing with'} ${petName||'your pet'}, a ${species.toLowerCase()}`:sceneDescription[scene];
  return <View testID={`pip-art-${scene}`} accessible accessibilityRole="image" accessibilityLabel={description} style={{width:232,height:174}}>
    <Svg width="100%" height="100%" viewBox="0 0 320 240" accessible={false}>
      <Path d="M23 155C3 93 40 38 103 48C150 12 237 19 280 77C330 139 294 207 224 215C142 244 49 226 23 155Z" fill={tint}/>
      <Ellipse cx="158" cy="211" rx="120" ry="11" fill={C.ink} opacity=".09"/>
      {(scene==='map'||scene==='discover')&&<G stroke={C.ink} strokeWidth="2.5" strokeLinejoin="round"><Path d="M234 80v104" stroke="#8da681" strokeWidth="9"/><Path d="m206 114 28-60 29 60-15-5 23 36h-73l22-35Z" fill="#9bb78a"/><Path d="M207 184q40-25 70 4" fill="none" stroke="#9bb78a" strokeWidth="5"/></G>}
      {scene==='calendar'&&<G transform="translate(176 57) rotate(7)" stroke={C.ink} strokeWidth="3"><Rect width="111" height="139" rx="16" fill={C.paper}/><Path d="M0 34h111M26-8v23M82-8v23" strokeLinecap="round"/><Rect x="13" y="49" width="33" height="30" rx="7" fill={C.gold} stroke="none"/><Rect x="62" y="49" width="33" height="30" rx="7" fill={C.peach} stroke="none"/><Rect x="13" y="92" width="33" height="30" rx="7" fill={C.sage} stroke="none"/><Path d="m66 107 9 9 24-27" fill="none" strokeWidth="5" strokeLinecap="round"/></G>}
      {scene==='supplies'&&<G transform="translate(207 111) rotate(8)" stroke={C.ink} strokeWidth="2.5"><Path d="M0 12 10 0h32l10 12v62H0Z" fill={C.paper}/><Path d="M7 17h38"/><Circle cx="26" cy="43" r="11" fill={C.sage}/><Path d="m22 42 5 8 5-13" fill="none"/></G>}
      <G transform={`translate(${companion?23:scene==='you'?72:38} 62) scale(1.04)`}><PipDrawing pose={pose}/></G>
      {companion&&<><G transform="translate(178 87) scale(.95)"><PetFace species={species}/></G>{scene==='pets'?<>{heart(192,44,.64)}{heart(245,28,.38)}<Path d="M148 166q22 12 39-1" fill="none" stroke={C.gold} strokeWidth="13" strokeLinecap="round"/></>:<><Ellipse cx="221" cy="54" rx="32" ry="9" fill={C.peach} stroke={C.ink} strokeWidth="3" transform="rotate(-15 221 54)"/><Path d="m258 41 13-10m-14 22h18M37 193l-8-14m14 9 2-12" fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round"/><Circle cx="167" cy="206" r="13" fill={C.gold} stroke={C.ink} strokeWidth="2"/><Path d="M155 203q14-6 22 9" fill="none" stroke={C.ink} strokeWidth="2"/></>}</>}
      {scene==='shopping'&&<G stroke={C.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><Path d="M151 161v-34q0-22 24-22t24 22v34" fill="none"/><Path d="m143 146-3-43h32l8 44" fill={C.paper}/><Path d="m157 118 5 4m-5 7 6 4"/><Path d="m204 140 5-36 19 5-8 37" fill={C.sage}/><Circle cx="199" cy="141" r="15" fill={C.gold}/><Path d="m125 145 15 56h81l15-56Z" fill="#d9aa7b"/><Path d="M136 162h90M141 181h80M153 151l4 44m22-44v44m24-44-5 44" opacity=".5"/><Path d="M122 145h118" strokeWidth="8"/></G>}
      {scene==='map'&&<G transform="translate(120 142) rotate(-7)" stroke={C.ink} strokeWidth="2.5" strokeLinejoin="round"><Path d="m0 0 35-11 35 11 35-11v61l-35 11-35-11L0 61Z" fill={C.paper}/><Path d="M35-11v61M70 0v61" stroke="#b0bda4"/><Path d="M9 39q22-43 40-15t40-10" fill="none" stroke="#8da681" strokeWidth="4" strokeDasharray="5 5"/><Path d="M88 10c-19-23 21-27 5 0l-3 4Z" fill={C.rust}/></G>}
      {scene==='help'&&<G transform="translate(110 137)" stroke={C.ink} strokeWidth="3" strokeLinejoin="round"><Path d="M0 0q30-10 58 5 31-15 60-5v61q-29-9-60 4-29-13-58-4Z" fill={C.paper}/><Path d="M58 5v60M12 43h30m30 0h31" fill="none"/><Circle cx="28" cy="23" r="10" fill={C.sage} stroke="none"/>{heart(86,12,.5)}</G>}
      {scene==='you'&&<>{heart(158,153,1.15)}<Path d="m55 92 3 9 9 3-9 3-3 9-3-9-9-3 9-3ZM251 111l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill={C.rust}/></>}
      {scene==='supplies'&&<G stroke={C.ink} strokeWidth="3" strokeLinejoin="round"><Path d="m119 156 47-19 65 16-47 21Z" fill={C.gold}/><Path d="m119 156 65 18v42l-65-19Z" fill="#d9aa7b"/><Path d="m184 174 47-21v43l-47 20Z" fill="#edc9a1"/><Path d="m152 145 63 16-18 8-64-18Z" fill={C.paper}/><Circle cx="151" cy="183" r="8" fill={C.paper} stroke="none"/></G>}
      {scene==='discover'&&<G stroke={C.ink} strokeWidth="4"><Circle cx="213" cy="119" r="34" fill={C.paper} fillOpacity=".8"/><Path d="m188 146-32 35" strokeWidth="13" strokeLinecap="round"/><Path d="m209 112 5-10 5 10 11 2-8 8 1 12-10-6-10 6 1-12-8-8Z" fill={C.gold} strokeWidth="2"/></G>}
      {scene==='care'&&<G stroke={C.ink} strokeWidth="3" strokeLinecap="round"><Path d="M102 163v-25m35 0v25q-18 25-35 0m17 13v12q22 12 28-5" fill="none"/><Circle cx="147" cy="180" r="6" fill={C.blue}/><Rect x="199" y="139" width="75" height="62" rx="13" fill={C.paper}/><Path d="M219 139v-13h33v13" fill="none"/><Path d="M235 153v29m-14-14h28" stroke={C.rust} strokeWidth="9"/></G>}
      <Circle cx="53" cy="52" r="5" fill={C.gold}/><Circle cx="277" cy="170" r="4" fill={C.rust}/>
    </Svg>
  </View>;
}
