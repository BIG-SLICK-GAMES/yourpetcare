import * as SecureStore from 'expo-secure-store';
const key='yourpetcare.welcome.v1';
export async function hasSeenWelcome(){try{return await SecureStore.getItemAsync(key)==='seen';}catch{return false;}}
export async function rememberWelcome(){try{await SecureStore.setItemAsync(key,'seen');}catch{/* The intro still closes if storage is unavailable. */}}
