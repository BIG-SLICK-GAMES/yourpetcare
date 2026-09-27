import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, SvgXml, Text as SvgText } from 'react-native-svg';
import { Pip, PipDrawing } from './Pip';
import { PipCareIllustration, PipScene } from './PipCareIllustration';
import { C, Icon, IconName } from './ui';
import { art } from './data/pet-art';

const descriptions:Record<PipScene,string>={hello:'Pip waving hello',care:'Pip introducing the app icons',services:'Pip helping you find a vet and pet services',outings:'Pip holding a walking map beside a park and cafe',name:'Pip offering your pet a heart-shaped name tag',species:'Pip meeting a group of different pets',goal:'Pip choosing a direction at a care and play signpost',username:'Pip holding your new profile card',password:'Pip holding a key beside a locked account',review:'Pip checking your pet’s profile on a clipboard',confirm:'Pip pointing to your choice to save',done:'Pip celebrating your saved pet with confetti'};
const symbol=(name:IconName,x:number,y:number,size=28)=><G transform={`translate(${x} ${y})`}><Icon name={name} size={size}/></G>;
const heart=<Path d="M0 8C-15-7-32 10-15 24L0 37 15 24C32 10 15-7 0 8Z" fill={C.peach} stroke={C.ink} strokeWidth="2"/>;

export function PipOnboardingArt({scene,species}:{scene:PipScene;species:string}){
  if(scene==='hello')return <Pip size={180}/>;
  if(scene==='care')return <PipCareIllustration/>;
  const pose=scene==='done'?'celebrate':scene==='goal'?'think':['services','confirm'].includes(scene)?'point':scene==='species'?'wave':'hold';
  return <View accessible accessibilityRole="image" accessibilityLabel={descriptions[scene]} style={{width:320,maxWidth:'100%',aspectRatio:4/3,alignSelf:'center'}}>
    <Svg width="100%" height="100%" viewBox="0 0 320 240" accessible={false}>
      <Path d="M26 152C4 94 50 37 115 49C168 2 261 29 285 89C336 167 257 219 181 213C111 240 37 211 26 152Z" fill={scene==='outings'||scene==='password'?C.blue:scene==='done'?C.gold:C.sage}/>
      <Ellipse cx="161" cy="210" rx="127" ry="12" fill="#c4d4be" opacity=".55"/>
      {scene==='services'&&<>
        <G transform="translate(173 53)"><Rect width="109" height="145" rx="17" fill={C.paper} stroke={C.ink} strokeWidth="2"/><Path d="M-8 32 55-6 117 32" fill={C.peach} stroke={C.ink} strokeWidth="3" strokeLinejoin="round"/><Rect x="40" y="83" width="32" height="62" rx="8" fill={C.blue}/><Path d="M48 39h14v12h12v14H62v12H48V65H36V51h12Z" fill={C.rust}/></G>
        <G transform="translate(16 65)"><PipDrawing pose={pose}/></G>
        <G transform="translate(17 16)"><Rect width="100" height="43" rx="15" fill="white"/>{symbol('care',8,7)}{symbol('food',40,7)}{symbol('play',70,10,23)}</G>
      </>}
      {scene==='outings'&&<>
        <Circle cx="245" cy="43" r="20" fill={C.gold}/><Path d="M19 196Q89 154 155 198T304 192" fill="none" stroke="#91b38a" strokeWidth="25"/>
        <Path d="M182 232Q264 199 231 167T265 126" fill="none" stroke={C.paper} strokeWidth="15"/>
        {symbol('tree',220,67,65)}{symbol('tree',13,105,54)}
        <G transform="translate(52 49)"><PipDrawing pose={pose}/></G>
        <G transform="translate(86 144) rotate(-8)"><Path d="m0 0 27-8 29 9 27-8v51l-27 8-29-9L0 51Z" fill={C.paper} stroke={C.ink} strokeWidth="2"/><Path d="M27-8v51M56 1v51" stroke="#9cbb9b" strokeWidth="2"/><Path d="M8 29q19-32 33-5t31-7" stroke={C.rust} strokeWidth="3" strokeDasharray="4 3" fill="none"/></G>
        <G transform="translate(253 146)"><Rect width="36" height="27" rx="7" fill={C.paper} stroke={C.ink} strokeWidth="2"/><Path d="M36 5q23 9 0 16M8-7v-9m10 9v-13" stroke={C.ink} strokeWidth="2" fill="none"/></G>
      </>}
      {scene==='name'&&<>
        <G transform="translate(45 44)"><PipDrawing pose={pose}/></G>
        <Path d="M150 150Q190 92 228 160" fill="none" stroke={C.rust} strokeWidth="3"/>
        <G transform="translate(228 139) scale(1.65)">{heart}<Circle cx="0" cy="13" r="2" fill={C.paper}/></G>
        <G transform="translate(179 180)"><Rect width="104" height="30" rx="12" fill="white"/><SvgText x="52" y="21" textAnchor="middle" fontSize="16" fontWeight="bold" fill={C.ink}>Hello, pet!</SvgText></G>
      </>}
      {scene==='species'&&<>
        <G transform="translate(88 10) scale(.9)"><PipDrawing pose={pose}/></G>
        {['Horse','Bird','Dog','Cat','Rabbit','Reptile'].map((animal,i)=><G key={animal} transform={`translate(${14+i*49} ${i===0||i===5?112:154})`}><SvgXml xml={art[animal]} width={55} height={55}/></G>)}
      </>}
      {scene==='goal'&&<>
        <Path d="M83 53v158" stroke={C.rust} strokeWidth="10" strokeLinecap="round"/>
        <Path d="M25 44h105l19 22-19 22H25Z" fill={C.gold} stroke={C.ink} strokeWidth="2"/>{symbol('food',67,51)}
        <Path d="M135 97H38l-19 22 19 22h97Z" fill={C.lavender} stroke={C.ink} strokeWidth="2"/>{symbol('play',67,105)}
        <Path d="M25 150h105l19 22-19 22H25Z" fill={C.peach} stroke={C.ink} strokeWidth="2"/>{symbol('heart',67,157)}
        <G transform="translate(150 64) scale(.95)"><PipDrawing pose={pose}/></G>
      </>}
      {scene==='username'&&<>
        <G transform="translate(119 29)"><PipDrawing pose={pose}/></G>
        <G transform="translate(29 130) rotate(-6)"><Rect width="160" height="82" rx="15" fill={C.paper} stroke={C.ink} strokeWidth="3"/><Circle cx="37" cy="40" r="25" fill={C.blue}/>{symbol('person',22,24,31)}<Path d="M77 28h61M77 42h43M77 56h54" stroke="#93ad9b" strokeWidth="5" strokeLinecap="round"/></G>
      </>}
      {scene==='password'&&<>
        <Path d="M237 57 290 78v51q-5 53-53 69-48-16-53-69V78Z" fill={C.paper} stroke={C.ink} strokeWidth="3"/>
        <Rect x="216" y="107" width="42" height="37" rx="8" fill={C.gold} stroke={C.ink} strokeWidth="2"/><Path d="M224 107V94q13-23 26 0v13M237 121v10" stroke={C.ink} strokeWidth="4" fill="none"/>
        <G transform="translate(13 63)"><PipDrawing pose={pose}/></G>
        <G transform="translate(114 184) rotate(-25)"><Circle r="16" fill={C.gold} stroke={C.rust} strokeWidth="4"/><Path d="M16 0h56m-10 0v13m-15-13v9" stroke={C.rust} strokeWidth="7" strokeLinecap="round"/></G>
      </>}
      {scene==='review'&&<>
        <G transform="translate(23 66)"><PipDrawing pose={pose}/></G>
        <G transform="translate(182 48) rotate(8)"><Rect width="99" height="142" rx="12" fill={C.peach} stroke={C.ink} strokeWidth="3"/><Rect x="9" y="12" width="81" height="120" rx="6" fill={C.paper}/><Rect x="29" y="-6" width="40" height="21" rx="7" fill={C.gold} stroke={C.ink} strokeWidth="2"/>{symbol('paw',34,26)}<Path d="M22 75h54M22 94h43M22 113h48" stroke="#94b29b" strokeWidth="5" strokeLinecap="round"/></G>
        <Path d="m153 182 49-74 10 7-49 74-14 8Z" fill={C.gold} stroke={C.rust} strokeWidth="2"/>
      </>}
      {scene==='confirm'&&<>
        <G transform="translate(18 54)"><PipDrawing pose={pose}/></G>
        <G transform="translate(191 57) rotate(6)"><Rect width="93" height="126" rx="18" fill={C.paper} stroke={C.ink} strokeWidth="3"/>{symbol('paw',30,15,33)}<Circle cx="47" cy="84" r="26" fill={C.sage}/><Path d="m31 83 11 12 22-26" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></G>
      </>}
      {scene==='done'&&<>
        <Path d="M25 31q136 58 270 0" fill="none" stroke={C.ink} strokeWidth="2"/><Path d="m52 42 10 27 14-21m37 8 13 28 13-26m40-2 14 24 10-28m34-7 13 21 12-26" fill={C.peach} stroke={C.rust} strokeWidth="2"/>
        <G transform="translate(51 68)"><PipDrawing pose={pose}/></G>
        <G transform="translate(216 145)"><SvgXml xml={art[species]||art.Dog} width={70} height={70}/></G>
        <G transform="translate(242 96)">{heart}</G>
        <Path d="m26 98 8 10m-9 65 9-5m252-75-9 12m-75 22 7 8M161 34l5-10" stroke={C.rust} strokeWidth="5" strokeLinecap="round"/><Circle cx="46" cy="141" r="4" fill={C.ink}/><Circle cx="289" cy="133" r="4" fill={C.ink}/>
      </>}
    </Svg>
  </View>;
}
