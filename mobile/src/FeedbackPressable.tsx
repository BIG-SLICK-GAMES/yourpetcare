import React from 'react';
import { Pressable as NativePressable } from 'react-native';
import { tapFeedback } from './feedback';

export const Pressable=React.forwardRef<React.ComponentRef<typeof NativePressable>,React.ComponentProps<typeof NativePressable>>(function FeedbackPressable({onPress,...props},ref){
  return <NativePressable {...props} ref={ref} onPress={event=>{if(onPress){tapFeedback();onPress(event);}}}/>;
});
