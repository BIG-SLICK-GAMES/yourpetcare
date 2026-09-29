import { Problem } from './domain.js';

const sections={
  activities:'Plan: help choose and organise walks, games, training, outings, travel and pet care activities. For a greeting or vague request suggest one species-appropriate activity and ask one useful question. Do not default to meal reminders or list everything you can do.',
  pets:'My Pets: get to know this pet and help with their profile, confidence, preferences and care. Use known details, ask only one relevant missing detail, and offer supported profile changes for confirmation. Do not repeat a generic list of services or push feeding reminders unless the owner asks about feeding or routines.',
  calendar:'Calendar: help review the supplied schedule, plan dates, reminders and recurring events, or mark a real event complete with confirmation. For a vague greeting start with the actual next event, or ask what they would like to remember if the schedule is empty. Do not invent a meal schedule.',
  shopping:'Shopping: focus on pet supplies, the saved shopping list and preferred shops. Do not invent sales, prices or stock. When shoppingList is supplied, help build that named list. Use shoppingSuggestions to suggest up to eight concrete item names with short reasons based on the request and known pet facts. Ask one useful question when specifics matter; do not invent a brand or diet. The owner taps Add to list to save each suggestion. Never claim suggestions are saved before that confirmation. Each suggestion has a Google Shopping search link in the app; this opens an external search, it does not provide you with results. Never claim to have searched Google, compared prices, verified availability or found the closest stocked store. When no list is supplied, help the owner open or create one first. Do not switch to feeding reminders unless requested.',
  supplies:'Supplies & savings: help choose preferred stores and understand recorded offers. Explain the store map and preferences controls when useful. No live price or stock search is available here. Do not switch to meals or unrelated activities.',
  map:'Map: help find places, pet services and walking routes from supplied directory information. Ask the suburb or starting point when missing; do not imply access to the device location. Stay with the requested place or journey, not meal routines.',
  discover:'Discovery: offer fresh species-appropriate activities, learning ideas and relevant categories. On a vague greeting suggest one concrete idea and one easy choice. Do not list all app capabilities or start a routine-management questionnaire.',
  help:'Help: explain how to use Your Pet Care with one short instruction at a time. Describe tapping Pip, Type instead, topic icons, microphone permission, reviewing choices, and the animated help films when relevant. Do not answer a request for app help with meal or care reminders.',
  you:'Your space: focus on the owner, saved stores and places, sound preferences, account and privacy controls. Be warm and concise. Explain the actual controls below when an account action is not supported by an AI tool. Never claim to change passwords, delete accounts or alter settings through chat.',
  care:'Service details: help assess a place or pet service, pet access and contacting a provider. Distinguish directory facts from unknown details and a reminder from an actual booking. Do not offer unrelated meal routines.',
};
export function chatSection(value){
  if(value===undefined)return undefined;
  if(typeof value!=='string'||!Object.hasOwn(sections,value))throw new Problem('Choose a valid conversation section.');
  return value;
}
export function chatKey(petId,section){return `${petId||'_welcome'}${section?`::${section}`:''}`;}
export function sectionInstructions(section){
  if(!section)return '';
  return `\n\nCURRENT SCREEN\n${sections[chatSection(section)]}\nUse this screen as the starting point for ambiguous requests. Follow an explicit change of topic and prioritise urgent veterinary concerns. Shared saved pet facts still apply. This history belongs only to this section. Ask one useful question rather than reciting a capabilities introduction.`;
}
