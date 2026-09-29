import { randomUUID } from 'node:crypto';
import { Problem } from './domain.js';

export function shoppingLists(account) {
  return account.shoppingLists || ((account.shopping || []).length ? [{id:'essentials',name:'My shopping list'}] : []);
}
export function shoppingItems(account) {
  return (account.shopping || []).map(item=>({...item,listId:item.listId||'essentials'}));
}
function listName(name){if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw new Problem('Give your list a name of up to 80 characters.');return name.trim();}
export function changeShopping(account,input) {
  let lists=shoppingLists(account),items=shoppingItems(account);
  if(input.action==='ensure_list'){
    // Opening shopping is idempotent, including concurrent tabs and retries.
    if(!lists.length)lists=[{id:'essentials',name:'My shopping list'}];
  }else if(input.action==='create_list'){
    const name=listName(input.name);
    if(lists.length>=30)throw new Problem('You can keep up to 30 lists.');
    if(lists.some(l=>l.name.toLowerCase()===name.toLowerCase()))throw new Problem('You already have a list with that name.',409);
    lists=[...lists,{id:randomUUID(),name}];
  }else if(['rename_list','delete_list'].includes(input.action)){
    const list=lists.find(l=>l.id===input.listId);
    if(!list)throw new Problem('That list is no longer available.',404);
    if(input.action==='delete_list'){
      lists=lists.filter(l=>l.id!==list.id);items=items.filter(i=>i.listId!==list.id);
      for(const key of Object.keys(account.messages||{}))if(key.endsWith('::shopping::'+list.id))delete account.messages[key];
      for(const key of Object.keys(account.pipTasks||{}))if(key.endsWith('::shopping::'+list.id))delete account.pipTasks[key];
    }else{
      const name=listName(input.name);
      if(lists.some(l=>l.id!==list.id&&l.name.toLowerCase()===name.toLowerCase()))throw new Problem('You already have a list with that name.',409);
      lists=lists.map(l=>l.id===list.id?{...l,name}:l);
    }
  }else if(input.action==='add'){
    const listId=input.listId===undefined?'essentials':input.listId;
    if(input.listId===undefined&&!lists.some(l=>l.id===listId))lists=[...lists,{id:listId,name:'My shopping list'}];
    if(!lists.some(l=>l.id===listId))throw new Problem('Choose an existing shopping list.',404);
    if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>150)throw new Problem('Enter an item of up to 150 characters.');
    if(typeof input.store!=='string'||input.store.length>100)throw new Problem('Choose a store of up to 100 characters.');
    if(items.filter(i=>i.listId===listId).length>=100)throw new Problem('Your list is full. Remove some collected items first.');
    const name=input.name.trim(),store=input.store.trim();
    if(items.some(i=>i.listId===listId&&!i.done&&i.name.toLowerCase()===name.toLowerCase()&&i.store.toLowerCase()===store.toLowerCase()))throw new Problem('That item is already on your list.',409);
    items=[...items,{id:randomUUID(),listId,name,store,done:false}];
  }else{
    const item=items.find(i=>i.id===input.id&&(input.listId===undefined||i.listId===input.listId));
    if(!item)throw new Problem('That shopping item is no longer on your list.',404);
    if(input.action==='check'&&typeof input.done==='boolean')items=items.map(i=>i.id===item.id?{...i,done:input.done}:i);
    else if(input.action==='remove')items=items.filter(i=>i.id!==item.id);
    else throw new Problem('Choose a valid shopping action.');
  }
  account.shoppingLists=lists;account.shopping=items;
}
