const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/place-distance.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {distanceKm,nearestPlaces,kilometres}=context.exports;
test('distance uses kilometres and the shortest arc across the date line',()=>{
 assert.equal(distanceKm({lat:0,lon:0},{lat:0,lon:0}),0);
 assert.ok(Math.abs(distanceKm({lat:0,lon:0},{lat:0,lon:1})-111.195)<.01);
 assert.ok(distanceKm({lat:0,lon:179.9},{lat:0,lon:-179.9})<23);
 assert.equal(distanceKm({lat:0,lon:0},{lat:NaN,lon:1}),null);
 assert.equal(kilometres(.02),'< 0.1 km');assert.equal(kilometres(1.234),'1.2 km');
});
test('nearest results sort before truncation without changing the catalogue, invalid coordinates last',()=>{
 const places=[{id:'far',lat:0,lon:2},{id:'invalid',lat:91,lon:1},{id:'near',lat:0,lon:.1}];
 const sorted=nearestPlaces(places,{lat:0,lon:0});assert.equal(sorted[0].place.id,'near');assert.equal(sorted[2].place.id,'invalid');assert.equal(places[0].id,'far');
});
