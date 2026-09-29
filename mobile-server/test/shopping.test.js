import test from 'node:test';
import assert from 'node:assert/strict';
import {changeShopping,shoppingLists,shoppingItems} from '../src/shopping.js';
import {accountView,initialAccount} from '../src/domain.js';
import {proposalFromAgentResult} from '../src/agent-actions.js';

test('legacy shopping migrates without losing items or ids; list edits stay isolated',()=>{
 const a=initialAccount('owner','hash');a.shopping=[{id:'old',name:'Hay',store:'Local farm',done:false}];
 assert.deepEqual(shoppingLists(a),[{id:'essentials',name:'My shopping list'}]);
 assert.equal(accountView(a).shopping[0].listId,'essentials');
 changeShopping(a,{action:'create_list',name:'Bird supplies'});const bird=a.shoppingLists.at(-1).id;
 changeShopping(a,{action:'add',listId:bird,name:'Hay',store:'Local farm'});
 assert.equal(a.shopping.length,2);assert.equal(a.shopping[0].id,'old');
 assert.throws(()=>changeShopping(a,{action:'check',listId:bird,id:'old',done:true}),/no longer/);
 changeShopping(a,{action:'rename_list',listId:bird,name:'Weekend'});
 assert.throws(()=>changeShopping(a,{action:'rename_list',listId:bird,name:'My shopping list'}),/already/);
 a.messages['pet::shopping::'+bird]=[{content:'bird only'}];a.messages['pet::shopping::essentials']=[{content:'keep'}];
 changeShopping(a,{action:'delete_list',listId:bird});assert.equal(a.shopping.length,1);assert.equal(a.shopping[0].name,'Hay');assert.equal(a.messages['pet::shopping::'+bird],undefined);assert.ok(a.messages['pet::shopping::essentials']);
 assert.throws(()=>changeShopping(a,{action:'add',listId:bird,name:'Toy',store:''}),/existing/);
 assert.throws(()=>changeShopping(a,{action:'delete_list',listId:bird}),/no longer/);
 assert.equal(shoppingItems(a).length,1);
});
test('invalid shopping actions leave saved data unchanged',()=>{
 const a=initialAccount('owner','hash');changeShopping(a,{action:'create_list',name:'Weekly'});const id=a.shoppingLists[0].id;
 for(const input of [{action:'create_list',name:' '},{action:'create_list',name:'weekly'},{action:'add',listId:id,name:'',store:''},{action:'add',listId:'foreign',name:'Food',store:''},{action:'rename_list',listId:'foreign',name:'Weekly'},{action:'check',id:'foreign',done:true}]){
  const before=structuredClone(a);assert.throws(()=>changeShopping(a,input));assert.deepEqual(a,before);
 }
});
test('AI shopping suggestions are bounded choices, not saved items or claimed prices',()=>{
 const facts={section:'shopping',shoppingList:{id:'list',items:[]},pet:null};
 const result={action:'none',reply:'Would these help?',shoppingSuggestions:[{name:'Bird toy',reason:'For enrichment.'}]};
 const response=proposalFromAgentResult(result,facts);assert.equal(response.input,null);assert.deepEqual(response.shoppingSuggestions,result.shoppingSuggestions);assert.deepEqual(facts.shoppingList.items,[]);
 assert.equal(proposalFromAgentResult(result,{pet:null,section:'calendar'}).shoppingSuggestions,undefined);
 assert.throws(()=>proposalFromAgentResult({...result,shoppingSuggestions:[{name:'',reason:'oops'}]},facts));
 assert.throws(()=>proposalFromAgentResult({...result,shoppingSuggestions:Array(9).fill(result.shoppingSuggestions[0])},facts));
});

import {stage,decide} from '../src/domain.js';
test('chat can offer shopping items, but only confirmation saves them; repeat confirmation is idempotent',()=>{
 const a=initialAccount('owner','hash');
 const result=proposalFromAgentResult({action:'add_shopping_items',reply:'Add these?',targetId:null,shoppingSuggestions:[{name:'Usual cat food 400g',reason:'Running low'},{name:'Litter',reason:'Restock'}]},{pet:null,shoppingLists:[]});
 const pending=stage(a,result.input,[]);assert.equal(a.shopping,undefined);assert.equal(a.shoppingLists,undefined);
 decide(a,pending.id,'confirm',[]);assert.equal(a.shopping.length,2);assert.equal(a.shoppingLists.length,1);assert.match(pending.report,/Added Usual cat food 400g, Litter/);
 decide(a,pending.id,'confirm',[]);assert.equal(a.shopping.length,2);
 const cancelled=stage(a,{action:'add_shopping_items',data:{listId:'essentials',items:[{name:'Toy',store:''}]}},[]);decide(a,cancelled.id,'cancel',[]);assert.equal(a.shopping.length,2);
});
test('chat shopping rejects missing, renamed and duplicate choices without partial writes',()=>{
 const a=initialAccount('owner','hash');changeShopping(a,{action:'create_list',name:'Weekly'});const id=a.shoppingLists[0].id;
 const input={action:'add_shopping_items',data:{listId:id,items:[{name:'Food',store:''},{name:'Toy',store:''}]}};
 const pending=stage(a,input,[]);changeShopping(a,{action:'add',listId:id,name:'Toy',store:''});
 assert.throws(()=>decide(a,pending.id,'confirm',[]),/already/);assert.equal(a.shopping.length,1);assert.equal(a.shopping[0].name,'Toy');
 const another=stage(a,{action:'add_shopping_items',data:{listId:id,items:[{name:'Bowl',store:''}]}},[]);changeShopping(a,{action:'rename_list',listId:id,name:'Travel'});assert.throws(()=>decide(a,another.id,'confirm',[]),/changed/);
 changeShopping(a,{action:'delete_list',listId:id});assert.throws(()=>decide(a,another.id,'confirm',[]),/no longer/);
 assert.throws(()=>stage(a,{action:'add_shopping_items',data:{listId:'foreign',items:[{name:'Food',store:''}]}},[]),/no longer/);
 assert.throws(()=>proposalFromAgentResult({action:'add_shopping_items',reply:'Add',targetId:null,shoppingSuggestions:[{name:'Toy'}]},{pet:null,shoppingLists:[{id:'a'},{id:'b'}]}),/which shopping list/);
});
