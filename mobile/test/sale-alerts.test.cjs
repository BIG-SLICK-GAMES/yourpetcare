const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function fixture(){
 const sent=[],storage=new Map([['yourpetcare.reminders','owner']]);let granted=true;
 const modules={'expo-notifications':{getPermissionsAsync:async()=>({granted}),scheduleNotificationAsync:async notification=>sent.push(notification)},'expo-secure-store':{getItemAsync:async k=>storage.get(k)||null,setItemAsync:async(k,v)=>storage.set(k,v)}};
 const context={exports:{},require:name=>modules[name]};const code=ts.transpileModule(fs.readFileSync(require.resolve('../src/sale-alerts.native.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,context);
 return {sync:context.exports.syncSaleAlerts,sent,storage,deny:()=>{granted=false;}};
}
const account={id:'owner',supplies:{saleAlerts:true}};
test('existing offers establish a baseline, new offers notify once, and concurrent refreshes deduplicate',async()=>{
 const f=fixture();await f.sync(account,[{id:'one'}]);assert.equal(f.sent.length,0);
 await Promise.all([f.sync(account,[{id:'one'},{id:'two'}]),f.sync(account,[{id:'one'},{id:'two'}])]);assert.equal(f.sent.length,1);assert.match(f.sent[0].content.body,/1 new or updated/);
 await f.sync(account,[]);await f.sync(account,[{id:'two'}]);assert.equal(f.sent.length,1);
});
test('opt-out, permission denial, a different owner and cancelled refresh do not send alerts',async()=>{
 const f=fixture();await f.sync(account,[{id:'one'}]);await f.sync({...account,supplies:{saleAlerts:false}},[{id:'two'}]);await f.sync({...account,id:'other'},[{id:'two'}]);await f.sync(account,[{id:'two'}],()=>false);f.deny();await f.sync(account,[{id:'two'}]);assert.equal(f.sent.length,0);
});
