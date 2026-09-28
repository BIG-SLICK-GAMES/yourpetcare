import React from 'react';
import { router } from 'expo-router';
import { CompanionPreview } from '../CompanionPreview';
import { Button, Label, Screen, Title } from '../ui';
export default function CompanionDemo(){return <Screen><Title>From remembering to doing.</Title><Label>Try the next chapter of Your Pet Care with fictional examples. These rules show the idea; they are separate from your live companion.</Label><CompanionPreview/><Button title="Meet your companion" icon="chat" onPress={()=>router.navigate({pathname:'/',params:{mode:'chat'}})}/><Button secondary title="How it works" icon="help" onPress={()=>router.push('/how-it-works')}/></Screen>;}
