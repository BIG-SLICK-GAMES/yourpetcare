const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/wake-state.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {wakeRequest,wakeEnabled,setWakeEnabled}=context.exports;
test('wake listening is off by default and accepts only the opening wake phrase',()=>{
 assert.equal(wakeEnabled(),false);assert.equal(wakeRequest('Hey Pip!'),'');assert.equal(wakeRequest('Hey, Pip, what is next?'),'what is next?');
 assert.equal(wakeRequest('I said hey Pip yesterday'),null);assert.equal(wakeRequest('hey people'),null);assert.equal(wakeRequest('ordinary conversation'),null);
 setWakeEnabled(true);assert.equal(wakeEnabled(),true);setWakeEnabled(false);assert.equal(wakeEnabled(),false);
});
