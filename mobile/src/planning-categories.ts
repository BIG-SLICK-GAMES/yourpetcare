import { C, IconName } from './ui';
export type PlanKind='activity'|'event'|'reminder';
export type PlanningCategory={id:string;title:string;icon:IconName;color:string;group:string;minutes:number;repeat:number;kind:PlanKind;places:string[]};
export const planningCategories:PlanningCategory[]=[
  {id:'walk',title:'Walks',icon:'paw',color:C.sage,group:'Fun together',minutes:20,repeat:0,kind:'activity',places:['park']},
  {id:'games',title:'Games',icon:'play',color:C.lavender,group:'Fun together',minutes:15,repeat:0,kind:'activity',places:[]},
  {id:'training',title:'Training',icon:'play',color:C.gold,group:'Fun together',minutes:15,repeat:0,kind:'activity',places:['trainer']},
  {id:'parks',title:'Parks',icon:'tree',color:C.sage,group:'Fun together',minutes:30,repeat:0,kind:'activity',places:['park']},
  {id:'sports',title:'Sports',icon:'play',color:C.blue,group:'Fun together',minutes:30,repeat:0,kind:'activity',places:['park','trainer']},
  {id:'dinner',title:'Dining out',icon:'food',color:C.peach,group:'Out & about',minutes:60,repeat:0,kind:'event',places:['cafe']},
  {id:'travel',title:'Travel',icon:'plane',color:C.blue,group:'Out & about',minutes:60,repeat:0,kind:'event',places:['hotel','boarding']},
  {id:'stay',title:'Stays',icon:'home',color:C.lavender,group:'Out & about',minutes:1440,repeat:0,kind:'event',places:['hotel','boarding']},
  {id:'roadtrip',title:'Road trips',icon:'map',color:C.gold,group:'Out & about',minutes:120,repeat:0,kind:'event',places:['park','hotel','cafe']},
  {id:'vet',title:'Vets',icon:'heart',color:C.peach,group:'Healthy pets',minutes:30,repeat:0,kind:'event',places:['vet']},
  {id:'meals',title:'Meals',icon:'food',color:C.gold,group:'Healthy pets',minutes:5,repeat:1,kind:'reminder',places:[]},
  {id:'medicine',title:'Medication',icon:'care',color:C.lavender,group:'Healthy pets',minutes:5,repeat:0,kind:'reminder',places:['vet']},
  {id:'worming',title:'Worming',icon:'care',color:C.peach,group:'Healthy pets',minutes:5,repeat:0,kind:'reminder',places:['vet','shop']},
  {id:'vaccines',title:'Vaccines',icon:'heart',color:C.blue,group:'Healthy pets',minutes:30,repeat:0,kind:'event',places:['vet']},
  {id:'grooming',title:'Grooming',icon:'groom',color:C.peach,group:'Extra care',minutes:45,repeat:0,kind:'event',places:['groomer']},
  {id:'sitting',title:'Pet sitting',icon:'person',color:C.blue,group:'Extra care',minutes:60,repeat:0,kind:'event',places:['sitter','boarding']},
  {id:'supplies',title:'Supplies',icon:'food',color:C.gold,group:'Extra care',minutes:30,repeat:0,kind:'reminder',places:['shop']},
  {id:'habitat',title:'Home care',icon:'home',color:C.sage,group:'Extra care',minutes:20,repeat:0,kind:'activity',places:[]},
  {id:'birthday',title:'Celebrations',icon:'heart',color:C.lavender,group:'More together',minutes:60,repeat:0,kind:'event',places:[]},
  {id:'other',title:'Something else',icon:'plus',color:C.sage,group:'More together',minutes:15,repeat:0,kind:'activity',places:[]},
];
