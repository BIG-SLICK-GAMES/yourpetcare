const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(require.resolve('../src/reminder-schedule.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const math={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/care-utils.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,math);
const context={exports:{},require:()=>math.exports};vm.runInNewContext(code,context);const {reminderSchedule}=context.exports;
test('missed meals still have future reminders, with a bounded chronological window',()=>{
  const now=Date.parse('2026-09-27T09:00:00Z');
  const meals=['07','18'].map((h,i)=>({id:String(i),startAt:`2026-09-26T${h}:00:00Z`,repeatDays:1,status:'planned'}));
  const occurrences=reminderSchedule(meals,now);
  assert.equal(occurrences.length,50);assert.equal(occurrences[0].at,Date.parse('2026-09-27T18:00:00Z'));assert.equal(occurrences[1].at,Date.parse('2026-09-28T07:00:00Z'));
  assert.ok(occurrences.every((o,i)=>o.at>now&&(!i||o.at>=occurrences[i-1].at)));
  assert.equal(reminderSchedule([{...meals[0],status:'completed'}],now).length,0);
  assert.equal(reminderSchedule([{...meals[0],repeatDays:0}],now).length,0);
});
test('calendar months, reminder lead time and snooze remain bounded',()=>{
 const event={id:'m',startAt:'2028-01-31T08:00:00Z',recurrence:{unit:'month',interval:1},repeatDays:0,status:'planned',reminderMinutes:60};
 const values=reminderSchedule([event],Date.parse('2028-02-01T00:00:00Z'),3);assert.equal(new Date(values[0].at).toISOString(),'2028-02-29T07:00:00.000Z');assert.equal(new Date(values[1].at).toISOString(),'2028-03-31T07:00:00.000Z');
 const now=Date.parse('2028-02-01T00:00:00Z');assert.equal(reminderSchedule([{...event,snoozedUntil:'2028-02-01T01:00:00Z'}],now,3)[0].at,now+3600000);
 assert.equal(math.exports.timelineGroup({...event,startAt:'2020-01-01T00:00:00Z'},now),'Overdue');
});
