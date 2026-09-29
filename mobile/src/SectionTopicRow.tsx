import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from './FeedbackPressable';
import { C, CircleButton, Icon } from './ui';
import { SectionTopic } from './section-topics';

export function SectionTopicRow({topics,onChoose,disabled=false,selectedTopic}:{topics:SectionTopic[];onChoose:(topic:SectionTopic)=>void;disabled?:boolean;selectedTopic?:string}){
  const scroll=useRef<ScrollView>(null),offset=useRef(0);
  const [width,setWidth]=useState(0),[contentWidth,setContentWidth]=useState(0),[position,setPosition]=useState(0);
  function move(direction:number){scroll.current?.scrollTo({x:Math.max(0,Math.min(contentWidth-width,offset.current+direction*Math.max(100,width*.8))),animated:false});}
  const previous=position>2,next=position+width<contentWidth-2;
  return <View testID="section-topic-row" style={{flexDirection:'row',alignItems:'center',gap:2}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Previous topics" disabled={!previous} onPress={()=>move(-1)} style={{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',opacity:previous?1:.3,backgroundColor:C.sage}}><View style={{transform:[{rotate:'90deg'}]}}><Icon name="chevrons-down" size={20}/></View></Pressable>
    <ScrollView ref={scroll} horizontal directionalLockEnabled showsHorizontalScrollIndicator={false} style={{flex:1}} contentContainerStyle={{gap:10,paddingVertical:8}} onLayout={e=>setWidth(e.nativeEvent.layout.width)} onContentSizeChange={w=>setContentWidth(w)} onScroll={e=>{offset.current=e.nativeEvent.contentOffset.x;setPosition(offset.current);}} scrollEventThrottle={32}>
      {topics.map(topic=><View key={topic.title} pointerEvents={disabled?'none':'auto'} accessibilityElementsHidden={disabled} importantForAccessibility={disabled?'no-hide-descendants':'auto'}><CircleButton active={selectedTopic===topic.title} title={topic.title} icon={topic.icon} color={topic.color} onPress={()=>{if(!disabled)onChoose(topic);}}/></View>)}
    </ScrollView>
    <Pressable accessibilityRole="button" accessibilityLabel="Next topics" disabled={!next} onPress={()=>move(1)} style={{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',opacity:next?1:.3,backgroundColor:C.sage}}><View style={{transform:[{rotate:'-90deg'}]}}><Icon name="chevrons-down" size={20}/></View></Pressable>
  </View>;
}
