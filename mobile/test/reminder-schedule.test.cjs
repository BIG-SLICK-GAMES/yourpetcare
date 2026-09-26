const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(require.resolve('../src/reminder-schedule.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const context={exports:{}};vm.runInNewContext(code,context);const {reminderSchedule}=context.exports;
test('missed meals still have future reminders, with a bounded chronological window',()=>{
  const now=Date.parse('2026-09-27T09:00:00Z');
  const meals=['07','18'].map((h,i)=>({id:String(i),startAt:`2026-09-26T${h}:00:00Z`,repeatDays:1,status:'planned'}));
  const occurrences=reminderSchedule(meals,now);
  assert.equal(occurrences.length,50);assert.equal(occurrences[0].at,Date.parse('2026-09-27T18:00:00Z'));assert.equal(occurrences[1].at,Date.parse('2026-09-28T07:00:00Z'));
  assert.ok(occurrences.every((o,i)=>o.at>now&&(!i||o.at>=occurrences[i-1].at)));
  assert.equal(reminderSchedule([{...meals[0],status:'completed'}],now).length,0);
  assert.equal(reminderSchedule([{...meals[0],repeatDays:0}],now).length,0);
});
