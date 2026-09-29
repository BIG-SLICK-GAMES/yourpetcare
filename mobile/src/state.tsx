import { loadFeedback, successFeedback } from './feedback';
import { fetchSupplyOffers } from './supply-offers';
import { syncSaleAlerts } from './sale-alerts';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState as NativeAppState } from 'react-native';
import { api, restoreToken, setToken, rememberUsername, ApiError } from './api';
import { Account, Catalog, Pet, Proposal, ProposalInput, ShoppingChange } from './types';
import directory from './data/providers.json';
import { syncReminders, clearReminders } from './reminders';

const fallback: Catalog = { providers: directory, species: ['Dog','Cat','Horse','Bird','Reptile','Rabbit','Guinea pig','Small mammal','Fish','Amphibian','Invertebrate','Farm animal','Other'], aiAvailable: false, weatherAvailable: false, crowdsAvailable: false };
type State = {
  account: Account | null; catalog: Catalog; selected: Pet | undefined; selectedId: string; select: (id: string) => void;
  onboardingOpen:boolean; setOnboardingOpen:(value:boolean)=>void;
  loading: boolean; online: boolean; notice: string; setNotice: (s: string) => void;
  refresh: () => Promise<void>; authenticate: (username: string, password: string, signup: boolean, remember?:boolean) => Promise<void>;
  attention: (id:string,action:'dismiss'|'restore') => Promise<void>;
  shopping: (change:ShoppingChange) => Promise<void>;
  logout: () => Promise<void>; remove: (password: string) => Promise<void>;
  propose: (input: ProposalInput) => Promise<Proposal>; decide: (id: string, decision: 'confirm'|'cancel') => Promise<Proposal>;
  chat: (message: string, consent: boolean, replaceId?:string) => Promise<{reply:string;proposal:Proposal|null}>; clearChat: () => Promise<void>;
  activeProposal: Proposal | null; setActiveProposal: (p: Proposal | null) => void;
};
const Context = createContext<State | null>(null);
export function AppState({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null), [catalog, setCatalog] = useState(fallback);
  const [onboardingOpen,setOnboardingOpen]=useState(false);
  const [selectedId, select] = useState(''), [loading, setLoading] = useState(true), [online, setOnline] = useState(false);
  const [notice, setNotice] = useState(''), [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const selected = account?.pets.find(p => p.id === selectedId) || account?.pets[0];
  const refresh = useCallback(async () => {
    try { setCatalog(await api<Catalog>('catalog')); setOnline(true); }
    catch { setOnline(false); }
    try { const result = await api<{account: Account}>('account'); setAccount(result.account); }
    catch (e) { if (e instanceof ApiError && e.status === 401) { await setToken(null); setAccount(null); } }
  }, []);
  useEffect(()=>{void loadFeedback();},[]);
  useEffect(() => { restoreToken().then(refresh).catch(() => setNotice('Could not restore your sign-in. Please sign in again.')).finally(() => setLoading(false)); }, [refresh]);
  useEffect(()=>{const subscription=NativeAppState.addEventListener('change',state=>{if(state==='active')void refresh();});return()=>subscription.remove();},[refresh]);
  useEffect(() => { if (account) void syncReminders(account).catch(() => setNotice('Your changes are saved, but device reminders could not update. Check notification permissions.')); }, [account]);
  useEffect(()=>{let active=true;if(account?.supplies?.saleAlerts&&online)void fetchSupplyOffers(account,catalog).then(feeds=>{if(active&&feeds.some(f=>f.status==='connected'))return syncSaleAlerts(account,feeds.flatMap(f=>f.offers),()=>active);}).catch(()=>setNotice('Offer alerts could not update. You can check offers in Supplies & savings.'));return()=>{active=false;};},[account,catalog,online]);
  async function authenticate(username: string, password: string, signup: boolean, remember=false) {
    const result = await api<{token: string; account: Account}>(signup ? 'signup' : 'login', { username, password });
    await setToken(result.token,remember); await rememberUsername(remember?result.account.username:null); setAccount(result.account); select(''); setActiveProposal(null); setNotice(''); await refresh();
  }
  async function attention(id:string,action:'dismiss'|'restore') {const result=await api<{account:Account}>('attention',{id,action});setAccount(result.account);}
  async function shopping(change:ShoppingChange) { const result=await api<{account:Account}>('shopping',change);setAccount(result.account);if(change.action==='check'&&change.done)successFeedback(); }
  async function logout() { await api('logout', {}); await clearReminders().catch(() => {}); await setToken(null); setAccount(null); select(''); setActiveProposal(null); }
  async function remove(password: string) { await api('account', {password}, 'DELETE'); await rememberUsername(null); await clearReminders().catch(() => {}); await setToken(null); setAccount(null); select(''); setActiveProposal(null); }
  async function propose(input: ProposalInput) {
    const result = await api<{proposal: Proposal; account: Account}>('proposals', input);
    setAccount(result.account); setActiveProposal(result.proposal); return result.proposal;
  }
  async function decide(id: string, decision: 'confirm'|'cancel') {
    const result = await api<{proposal: Proposal; account: Account}>(`proposals/${id}/decision`, { decision });
    setAccount(result.account); setActiveProposal(result.proposal);
    if(decision==='confirm'&&result.proposal.status==='confirmed'&&result.proposal.action==='complete_event'&&account?.proposals.some(p=>p.id===id))successFeedback();
    if (result.proposal.action === 'add_pet' && result.proposal.status === 'confirmed' && result.proposal.resultId) select(result.proposal.resultId);
    return result.proposal;
  }
  async function chat(message: string, consent: boolean, replaceId?:string) {
    const result = await api<{reply:string;proposal: Proposal | null; account: Account}>('chat', { message, consent, petId: selected?.id, replaceId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    setAccount(result.account); if (result.proposal) setActiveProposal(result.proposal); return result;
  }
  async function clearChat() { const result = await api<{account: Account}>('chat/clear', { petId: selected?.id }); setAccount(result.account); }
  const value = { onboardingOpen,setOnboardingOpen,account, catalog, selected, selectedId, select, loading, online, notice, setNotice, refresh, authenticate, attention, shopping, logout, remove, propose, decide, chat, clearChat, activeProposal, setActiveProposal };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() { const value = useContext(Context); if (!value) throw new Error('App state missing'); return value; }
