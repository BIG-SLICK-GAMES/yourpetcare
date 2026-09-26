import { IconName } from './ui';
import { Pet } from './types';
export const groups: {id:string;name:string;icon:IconName;color:string;categories:string[];activities:string[]}[] = [
  {id:'fun',name:'Fun together',icon:'play',color:'#f0ddcd',categories:['park','trainer'],activities:['Play & enrichment','Training','Sports','Parks']},
  {id:'healthy',name:'Healthy pets',icon:'heart',color:'#e6deee',categories:['vet','shop'],activities:['Vet visits','Food & supplies','Preventive care']},
  {id:'extra',name:'Extra care',icon:'care',color:'#dcebf0',categories:['sitter','boarding','groomer','shelter','charity','funeral'],activities:['Pet sitting','Walking','Grooming','Pounds & rescue','Charities','Farewell care']},
  {id:'out',name:'Out & about',icon:'plane',color:'#f0e4bb',categories:['cafe','hotel'],activities:['Dinner together','Stays','Road trips','Flying']},
];
export function ideas(pet?:Pet) {
  if (!pet) return ['A little outdoor time','Play & enrichment','A quiet day together'];
  if (pet.species==='Dog') return pet.social==='quiet'?['A quiet sniff walk','Play at home','Practise a familiar cue']:['A sniff walk','Play together','A training game'];
  if (pet.species==='Horse') return ['Quiet grooming time','Familiar groundwork','Check the paddock'];
  if (pet.species==='Bird') return ['Familiar enrichment','A short training game','Refresh the play space'];
  return ['A little enrichment','Refresh their space','Quiet time together'];
}
export function categoryIcon(category:string):IconName { return ({park:'tree',trainer:'play',vet:'heart',shop:'food',hotel:'plane',cafe:'food',shelter:'paw',charity:'heart',funeral:'heart'} as Record<string,IconName>)[category]||'care'; }
