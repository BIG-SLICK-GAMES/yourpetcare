import { MongoClient } from 'mongodb';
import { Problem } from './domain.js';

export async function connectRepository(uri, name) {
  if (!uri) throw new Error('Set YPC_MONGODB_URI privately on the server.');
  if (!/^yourpetcare(?:_[a-z0-9]+)?$/.test(name)) throw new Error('Use a dedicated yourpetcare database.');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const accounts = client.db(name).collection('accounts');
  const settings = client.db(name).collection('settings');
  await accounts.createIndex({ username: 1 }, { unique: true });
  await accounts.createIndex({ 'tokens.hash': 1 });
  return {
    close: () => client.close(),
    getAiSettings: () => settings.findOne({ _id: 'ai' }),
    setAiSettings: row => settings.replaceOne({ _id: 'ai' }, { ...row, _id: 'ai' }, { upsert: true }),
    async create(account) { try { await accounts.insertOne(account); return account; } catch (e) { if (e.code === 11000) throw new Problem('That username is unavailable.', 409); throw e; } },
    byUsername: username => accounts.findOne({ username }),
    byToken: hash => accounts.findOne({ 'tokens.hash': hash }),
    async listAccounts(search, page) {
      const filter = search ? { username: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {};
      const accountsPage = await accounts.aggregate([{ $match: filter }, { $sort: { username: 1 } }, { $skip: page * 25 }, { $limit: 25 }, { $project: { _id: 0, id: '$_id', username: 1, createdAt: 1, disabled: { $eq: ['$disabled', true] }, pets: { $size: '$pets' }, events: { $size: '$events' } } }]).toArray();
      return { accounts: accountsPage, page, total: await accounts.countDocuments(filter) };
    },
    async change(id, mutate, { admin = false } = {}) {
      // A single owner document makes a confirmation atomic, including its result.
      for (let attempt = 0; attempt < 8; attempt++) {
        const account = await accounts.findOne({ _id: id });
        if (!account) throw new Problem('Account not found.', 404);
        if (account.disabled && !admin) throw new Problem('This account is suspended. Contact support.', 403);
        const version = account.version;
        const result = mutate(account);
        account.version++;
        const updated = await accounts.replaceOne({ _id: id, version }, account);
        if (updated.modifiedCount === 1) return { account, result };
      }
      throw new Problem('Your account changed in another session. Please try again.', 409);
    },
    async remove(id, version) {
      const result = await accounts.deleteOne({ _id: id, version });
      if (!result.deletedCount) throw new Problem('Your account changed. Please try again.', 409);
    },
  };
}
