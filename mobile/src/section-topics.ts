import { C, IconName } from './ui';
import { planningCategories } from './planning-categories';
import { PipSectionScene } from './PipSectionArt';

export type SectionTopic={title:string;icon:IconName;color:string;draft:string};
type Choice=[string,IconName,string];
const choices:Record<Exclude<PipSectionScene,'activities'>,Choice[]>={
  pets:[['New pet','plus','Help me add a new pet.'],['Profile','paw','Help me update my pet profile.'],['My vet','heart','Help me remember my preferred vet.'],['Meals','food','Help me with my pet feeding routine.'],['Training','play','Let us talk about my pet training level.'],['Confidence','heart','Let us talk about what makes my pet comfortable.'],['Care notes','care','Help me remember something about my pet care.']],
  calendar:[['Coming up','calendar','What is coming up for my pet?'],['New event','plus','Help me arrange a new event.'],['Reminder','bell','Help me set a reminder.'],['Repeat','calendar','Help me organise a recurring reminder.'],['Change a plan','care','Help me review a plan I want to change.'],['Completed','check','Help me mark a task as completed.']],
  shopping:[['My list','shop','Help me work out what I need on my shopping list.'],['Food','food','Help me plan my usual pet food shopping.'],['Treats','heart','Help me think about suitable treats for my pet.'],['Toys','play','Help me choose enrichment toys for my pet.'],['Bedding','home','Help me think about bedding and habitat supplies.'],['Local shops','map','Help me find a local pet supplies shop.'],['Specials','shop','How can I check specials from my saved shops?']],
  supplies:[['Find a shop','map','Help me find a pet supplies shop.'],['Saved stores','heart','Help me manage my preferred stores.'],['Specials','shop','Help me check for available store offers.'],['Sale dates','calendar','Help me remember a sale date.'],['Alerts','bell','How do I enable store offer alerts?']],
  map:[['All places','map','Help me explore places nearby.'],['Parks','tree','Help me find a suitable park.'],['Walk routes','paw','Help me plan a walking route.'],['Vets','heart','Help me find a vet.'],['Shops','shop','Help me find a pet supplies shop.'],['Dining','food','Help me find somewhere pet friendly to eat.'],['Stays','home','Help me find pet friendly accommodation.'],['Boarding','home','Help me find boarding for my pet.'],['Grooming','groom','Help me find a groomer.'],['Sitters','person','Help me find a pet sitter.'],['Training','play','Help me find a trainer.'],['Rescue','paw','Help me find a shelter or rescue.'],['Charities','heart','Help me find an animal charity.'],['Farewell','care','Help me find gentle farewell support for my pet.']],
  discover:[['Fun together','play','Suggest something fun suited to my pet.'],['Healthy pets','heart','Help me learn about caring for my pet health.'],['Extra care','care','Help me explore extra care services.'],['Out & about','plane','Suggest a pet friendly outing.'],['At home','home','Suggest an enrichment activity at home.'],['Learn','help','Help me learn something useful about my pet.']],
  help:[['About YPC','heart','What is Your Pet Care here to help with?'],['Meet my pet','paw','How do I add or update a pet?'],['Talk to Pip','chat','How do voice and typed conversations work?'],['Meals','food','How do I set meal reminders?'],['Adventures','map','How do I plan a walk or activity?'],['Find help','care','How do I find pet services?'],['Your choices','check','How do I review and confirm what Pip suggests?'],['Calendar','calendar','How do calendar reminders work?'],['Privacy','person','How do I manage my account and data?'],['Support','heart','How can this app help when life feels busy?']],
  you:[['Preferences','person','Help me find my account preferences.'],['Saved places','map','Help me manage my saved places.'],['My stores','shop','Help me manage my preferred stores.'],['Sound & touch','sound','How do I change sound and vibration?'],['My data','care','How do I export or manage my data?'],['Sign in & out','person','How do sign in and sign out work?']],
  care:[['Pet access','paw','What should I check about pet access at this place?'],['Website','search','Help me find the website for this service.'],['Favourite','heart','Help me save a place to my favourites.'],['Plan a visit','calendar','Help me plan a visit to this service.'],['Contact','chat','What should I ask this provider before visiting?']],
};
export function sectionTopics(scene:PipSectionScene,petName='my pet'):SectionTopic[]{
  if(scene==='activities')return planningCategories.map(c=>({title:c.title,icon:c.icon,color:c.color,draft:`Help me plan ${c.title.toLowerCase()} for ${petName}.`}));
  const colours=[C.sage,C.peach,C.blue,C.gold,C.lavender];
  return choices[scene].map(([title,icon,draft],i)=>({title,icon,draft,color:colours[i%colours.length]}));
}
export function sectionIntroduction(scene:PipSectionScene,petName='your pet'){
  return {
    activities:`Let's plan something for ${petName}. Choose an activity or tell me your idea.`,
    pets:`Let's get to know ${petName}. Choose a care topic or tell me what's new.`,
    calendar:'Review what is coming up, add a plan or set a reminder.',
    shopping:'Choose what you need, find a shop or explore available specials.',
    supplies:'Find your favourite stores and keep track of supplies and sale dates.',
    map:'Choose a type of place or tell me where you would like to go.',
    discover:`Find fresh ideas for ${petName}. Choose something to explore.`,
    help:'Choose a feature and I will show you how it works.',
    you:'Manage your preferences, saved places and account with me.',
    care:'Ask about this place, check pet access or plan a visit.',
  }[scene];
}

export const mapTopicCategories:Record<string,string>={'All places':'',Parks:'park',Vets:'vet',Shops:'shop',Dining:'cafe',Stays:'hotel',Boarding:'boarding',Grooming:'groomer',Sitters:'sitter',Training:'trainer',Rescue:'shelter',Charities:'charity',Farewell:'funeral'};
