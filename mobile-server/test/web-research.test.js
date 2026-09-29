import test from 'node:test';
import assert from 'node:assert/strict';
import {askAgent,researchSources} from '../src/agent.js';

const choice=(extra={})=>({type:'function_call',name:'offer_choice',arguments:JSON.stringify({reply:'The club lists Saturday at 9am. Shall we plan a visit?',action:'none',...extra})});
test('research continues into a review-only answer with real source metadata',async()=>{
  const requests=[];
  const research=[{type:'web_search_call',action:{sources:[{url:'https://example.com/classes'}]}},{type:'message',role:'assistant',content:[{type:'output_text',text:'Saturday 9am',annotations:[{type:'url_citation',url:'https://example.com/classes',title:'Club classes'}]}]}];
  const result=await askAgent({pet:{id:'p'}},[],'Check beginner classes',{apiKey:'mock',model:'mock',fetcher:async(_url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({output:requests.length===1?research:[choice()]})};}});
  assert.equal(requests.length,2);
  assert.equal(requests[0].tools[1].type,'web_search');
  assert.equal(requests[0].tools[1].external_web_access,true);
  assert.equal(requests[1].tool_choice.name,'offer_choice');
  assert.equal(result.sources.length,1);
  assert.equal(result.sources[0].url,'https://example.com/classes');
  assert.ok(result.researchedAt);
  assert.ok(!result.input);
});
test('simple conversation skips research and invented source arguments are ignored',async()=>{
  let count=0;
  const result=await askAgent({pet:{id:'p'}},[],'Hello',{apiKey:'mock',model:'mock',fetcher:async()=>{count++;return {ok:true,json:async()=>({output:[choice({sources:[{url:'https://invented.example'}]})]})};}});
  assert.equal(count,1);assert.equal(result.sources,undefined);
});
test('invalid source URLs are excluded and repeated sources are deduplicated',()=>{
  const sources=researchSources([{type:'web_search_call',action:{sources:[{url:'javascript:alert(1)'},{url:'https://user:pass@example.com/'},{url:'https://example.com/'},{url:'https://example.com/'}]}}]);
  assert.deepEqual(sources,[{url:'https://example.com/',title:'example.com'}]);
});
test('research failure cannot produce a proposal or false success',async()=>{
  await assert.rejects(askAgent({pet:{id:'p'}},[],'Check classes',{apiKey:'mock',model:'mock',fetcher:async()=>{throw new Error('timeout');}}),/No changes were made/);
});
