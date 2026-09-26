import test from 'node:test';
import assert from 'node:assert/strict';
import { aiSettings } from '../src/ai-settings.js';
import { transcribeAudio } from '../src/voice.js';
import { agentFacts, askAgent } from '../src/agent.js';
import { initialAccount, stage, decide } from '../src/domain.js';

test('admin AI keys are encrypted, never returned and removable without fallback', async () => {
  let row=null;
  const repository={getAiSettings:async()=>row,setAiSettings:async value=>{row=value;}};
  const settings=aiSettings(repository,'a'.repeat(64),{apiKey:'legacy-key',model:'test-model'});
  const key='sk-test-secret-for-encryption-only';
  const status=await settings.save({apiKey:key},{id:'staff'});
  assert.equal(status.configured,true);assert.equal(JSON.stringify(status).includes(key),false);
  assert.equal(JSON.stringify(row).includes(key),false);assert.equal(row.updatedBy,'staff');
  assert.equal((await settings.load()).apiKey,key);
  await settings.test(async(_,options)=>{assert.equal(options.headers.Authorization,'Bearer '+key);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};});
  row.tag='0'.repeat(32);await assert.rejects(settings.load());
  await settings.save({remove:true},{id:'staff'});assert.equal((await settings.load()).apiKey,'');
  assert.equal((await settings.status()).configured,false);
  await assert.rejects(aiSettings(repository,'',{}).save({apiKey:key},{id:'staff'}),/storage/);
});

test('voice requires consent and bounded valid audio; provider failures stay generic', async () => {
  const body={audio:Buffer.alloc(200).toString('base64'),mimeType:'audio/webm',consent:true};
  await assert.rejects(transcribeAudio(body,{apiKey:''}),/connection/);
  await assert.rejects(transcribeAudio({...body,consent:false},{apiKey:'mock'}),/sharing/);
  await assert.rejects(transcribeAudio({...body,mimeType:'text/html'},{apiKey:'mock'}),/recording/);
  await assert.rejects(transcribeAudio({...body,audio:'A'.repeat(5600001)},{apiKey:'mock'}),/recording/);
  const result=await transcribeAudio(body,{apiKey:'mock',fetcher:async(_,options)=>{assert.equal(options.body.get('file').name,'voice.webm');assert.equal(options.body.get('model'),'gpt-transcribe');return {ok:true,json:async()=>({text:'Plan a quiet walk'})};}});
  assert.equal(result.text,'Plan a quiet walk');
  await assert.rejects(transcribeAudio(body,{apiKey:'mock',fetcher:async()=>({ok:false})}),/Try again/);
});

test('AI can introduce a pet through conversation but still requires confirmation', async () => {
  const account=initialAccount('owner','hash'),facts=agentFacts(account,null,[]);
  assert.equal(facts.pet,null);
  const response=await askAgent(facts,[],'My bird is Pip',{apiKey:'mock',model:'mock',fetcher:async()=>({ok:true,json:async()=>({output:[{type:'function_call',name:'offer_choice',arguments:JSON.stringify({reply:'Meet Pip?',action:'add_pet',petName:'Pip',species:'Bird'})}]})})});
  const proposal=stage(account,response.input,[]);
  assert.equal(account.pets.length,0);decide(account,proposal.id,'confirm',[]);assert.equal(account.pets[0].species,'Bird');
  assert.throws(()=>agentFacts(account,'someone-else',[]),/Choose a pet/);
});
