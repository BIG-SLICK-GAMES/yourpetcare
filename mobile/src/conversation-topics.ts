import { C, IconName } from './ui';

export const conversationTopics: {title:string;icon:IconName;color:string;draft:string}[]=[
  {title:'Know my pet',icon:'paw',color:C.sage,draft:'Help me get to know my pet.'},
  {title:'Our day',icon:'calendar',color:C.gold,draft:'Help plan our day.'},
  {title:'Walks',icon:'map',color:C.blue,draft:'Help me plan a walk.'},
  {title:'Meals',icon:'food',color:C.peach,draft:'Help me remember meal times.'},
  {title:'Vet care',icon:'heart',color:C.lavender,draft:'Help organise vet care.'},
  {title:'Remember',icon:'chat',color:C.sage,draft:'Remember something about my pet.'}
];
