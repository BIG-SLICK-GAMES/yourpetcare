const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};};
function load(platform,local=storage(),session=storage(),secure=storage()){
 const modules={'react-native':{Platform:{OS:platform}},'expo-secure-store':{getItemAsync:async k=>secure.getItem(k),setItemAsync:async(k,v)=>secure.setItem(k,v),deleteItemAsync:async k=>secure.removeItem(k)}};
 const context={exports:{},require:n=>modules[n],process:{env:{}},localStorage:local,sessionStorage:session};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/api.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);return {...context.exports,local,session,secure};
}
test('browser refresh restores a tab session; remembering persists across tabs; logout removes both tokens',async()=>{
 const f=load('web');await f.setToken('tab-token');assert.equal(f.local.getItem('yourpetcare.session'),null);assert.equal(await load('web',f.local,f.session).restoreToken(),'tab-token');assert.equal(await load('web',f.local).restoreToken(),null);
 await f.setToken('remembered-token',true);await f.rememberUsername('owner');assert.equal(await load('web',f.local).restoreToken(),'remembered-token');assert.equal(await f.savedUsername(),'owner');assert.equal(f.session.getItem('yourpetcare.session'),null);
 await f.setToken(null);assert.equal(await load('web',f.local,f.session).restoreToken(),null);assert.equal(await f.savedUsername(),'owner');await f.rememberUsername(null);assert.equal(await f.savedUsername(),null);
});
test('native sign-in persists only with permission and supports forgetting the username',async()=>{
 const f=load('ios');await f.setToken('temporary');assert.equal(await load('ios',f.local,f.session,f.secure).restoreToken(),null);await f.setToken('persistent',true);await f.rememberUsername('owner');assert.equal(await load('ios',f.local,f.session,f.secure).restoreToken(),'persistent');await f.setToken(null);await f.rememberUsername(null);assert.equal(f.secure.map.size,0);
});
