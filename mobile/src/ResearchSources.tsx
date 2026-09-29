import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { Pressable } from './FeedbackPressable';
import { ErrorText, Label } from './ui';
import { Message } from './types';

export function ResearchSources({sources,checkedAt}:{sources:Message['sources'];checkedAt?:string}) {
  const [error,setError]=useState('');
  if(!sources?.length)return null;
  return <View testID="research-sources" style={{gap:4}}>
    <Label small muted>Sources{checkedAt&&Number.isFinite(Date.parse(checkedAt))?` · Looked up ${new Date(checkedAt).toLocaleDateString()}`:''}</Label>
    {sources.map(source=><Pressable key={source.url} accessibilityRole="link" accessibilityLabel={`Open source: ${source.title}`} onPress={()=>{if(!/^https?:\/\//i.test(source.url))return;setError('');void Linking.openURL(source.url).catch(()=>setError('Could not open this source. Please try again.'));}} style={{minHeight:44,justifyContent:'center',paddingVertical:8}}><Label small style={{textDecorationLine:'underline'}}>{source.title}</Label></Pressable>)}
    <ErrorText message={error}/>
  </View>;
}
