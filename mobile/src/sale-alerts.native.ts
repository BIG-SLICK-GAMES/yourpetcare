import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Account, SupplyOffer } from './types';
let queue:Promise<void>=Promise.resolve();
export function syncSaleAlerts(account:Account,offers:SupplyOffer[],isCurrent:()=>boolean=()=>true){
  const run=queue.catch(()=>{}).then(async()=>{
    if(!isCurrent()||!account.supplies?.saleAlerts||account.notificationPreferences?.optional===false||await SecureStore.getItemAsync('yourpetcare.reminders')!==account.id)return;
    if(!(await Notifications.getPermissionsAsync()).granted)return;
    const key=`yourpetcare.sales.${account.id}`,previous=await SecureStore.getItemAsync(key);
    let seen:string[]=[];try{seen=JSON.parse(previous||'[]');}catch{seen=[];}
    const fresh=offers.filter(o=>!seen.includes(o.id));
    // First refresh establishes a baseline; old catalogue items are not "new sales".
    if(!isCurrent()||await SecureStore.getItemAsync('yourpetcare.reminders')!==account.id)return;
    if(previous&&fresh.length)await Notifications.scheduleNotificationAsync({content:{title:'Store offers updated',body:`${fresh.length} new or updated listing${fresh.length===1?'':'s'}. Open You → Supplies & savings to check the store’s terms.`,data:{screen:'supplies'}},trigger:null});
    await SecureStore.setItemAsync(key,JSON.stringify([...new Set([...seen,...offers.map(o=>o.id)])].slice(-100)));
  });queue=run;return run;
}
