const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/voice-turn.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {voiceTurn}=context.exports;
test('natural pauses end a spoken turn but empty silence is never sent',()=>{
 const state={heard:false,lastSound:0,voicedFrames:0};
 assert.equal(voiceTurn(state,-90,3000,0),'listen');
 for(const t of [3100,3250,3400])assert.equal(voiceTurn(state,-20,t,0),'listen');
 assert.equal(voiceTurn(state,-90,4400,0),'listen');
 assert.equal(voiceTurn(state,-90,5250,0),'send');
 assert.equal(voiceTurn({heard:false,lastSound:0,voicedFrames:0},-90,12000,0),'idle');
 assert.equal(voiceTurn({heard:false,lastSound:0,voicedFrames:0},undefined,12000,0),'idle');
});
