const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/companion-preview.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);const {exampleContext,previewRules,emptyPreview,previewAction}=context.exports;
test('preview explains example stock arithmetic without inventing a treatment schedule',()=>{
 const notices=previewRules.notices({...exampleContext,treatmentDays:10,foodGrams:900,dailyGrams:300});assert.match(notices[0].message,/10 days/);assert.match(notices[2].message,/3 days/);assert.match(notices[2].evidence,/900 g.*300 g/);assert.match(previewRules.notices({...exampleContext,dailyGrams:0})[2].message,/Enter daily usage/);assert.equal(exampleContext.foodGrams,800);
});
test('repeated example actions do not duplicate entries; complete and reset stay isolated',()=>{
 const notice=previewRules.notices(exampleContext)[0],untouched=emptyPreview();let state=previewAction(emptyPreview(),{type:'reminder',notice});state=previewAction(state,{type:'reminder',notice});assert.equal(state.reminders.length,1);assert.equal(untouched.reminders.length,0);
 state=previewAction(state,{type:'shopping',notice});state=previewAction(state,{type:'shopping',notice});assert.equal(state.shopping.length,1);state=previewAction(state,{type:'complete',id:notice.id});state=previewAction(state,{type:'complete',id:notice.id});state=previewAction(state,{type:'reminder',notice});assert.equal(state.history.length,1);assert.equal(state.reminders.length,0);assert.equal(state.shopping.length,1);assert.equal(previewAction(state,{type:'reset'}).history.length,0);
});
test('not now does not create a reminder or shopping entry',()=>{
 const state=previewAction(emptyPreview(),{type:'dismiss',id:'vaccination'});assert.equal(state.reminders.length,0);assert.equal(state.shopping.length,0);assert.equal(state.dismissed.length,1);
});
