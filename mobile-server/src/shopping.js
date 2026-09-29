import { randomUUID } from 'node:crypto';
import { Problem } from './domain.js';

// Item-level mutations preserve other items when two devices edit the list.
export function changeShopping(account, input) {
  const items = account.shopping || [];
  if (input.action === 'add') {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 150) throw new Problem('Enter an item of up to 150 characters.');
    if (typeof input.store !== 'string' || input.store.length > 100) throw new Problem('Choose a store of up to 100 characters.');
    if (items.length >= 100) throw new Problem('Your list is full. Remove some collected items first.');
    const name = input.name.trim(), store = input.store.trim();
    if (items.some(i => !i.done && i.name.toLowerCase() === name.toLowerCase() && i.store.toLowerCase() === store.toLowerCase())) throw new Problem('That item is already on your list.', 409);
    account.shopping = [...items, { id: randomUUID(), name, store, done: false }];
  } else {
    const item = items.find(i => i.id === input.id);
    if (!item) throw new Problem('That shopping item is no longer on your list.', 404);
    if (input.action === 'check' && typeof input.done === 'boolean') account.shopping = items.map(i => i.id === item.id ? { ...i, done: input.done } : i);
    else if (input.action === 'remove') account.shopping = items.filter(i => i.id !== item.id);
    else throw new Problem('Choose a valid shopping action.');
  }
}
