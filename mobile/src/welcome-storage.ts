const key='yourpetcare.welcome.v1';
export async function hasSeenWelcome(){try{return window.localStorage.getItem(key)==='seen';}catch{return false;}}
export async function rememberWelcome(){try{window.localStorage.setItem(key,'seen');}catch{/* The intro still closes if storage is unavailable. */}}
