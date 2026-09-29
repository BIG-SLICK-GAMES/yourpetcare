import React from 'react';
import {router} from 'expo-router';
import {BrandLogo} from '../BrandLogo';
import {RetailerDiscovery} from '../RetailerDiscovery';
import {retailerActive} from '../retailer';
import {Button,Label,Screen} from '../ui';
export default function RetailerScreen(){return <Screen><BrandLogo width={320}/>{retailerActive?<RetailerDiscovery/>:<Label>Explore nearby stores on the map.</Label>}<Button secondary title="Back home" icon="home" onPress={()=>router.replace('/home')}/></Screen>;}
