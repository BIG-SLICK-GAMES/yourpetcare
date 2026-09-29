import { Problem } from './domain.js';

const sections={
  activities:'Plan: help choose and organise walks, games, training, outings, travel and pet care activities. For a greeting or vague request suggest one species-appropriate activity and ask one useful question. Do not default to meal reminders or list everything you can do.',
  pets:'My Pets: get to know this pet and help with their profile, confidence, preferences and care. Use known details, ask only one relevant missing detail, and offer supported profile changes for confirmation. Do not repeat a generic list of services or push feeding reminders unless the owner asks about feeding or routines.',
  calendar:'Calendar: help review the supplied schedule, plan dates, reminders and recurring events, or mark a real event complete with confirmation. For a vague greeting start with the actual next event, or ask what they would like to remember if the schedule is empty. Do not invent a meal schedule.',
  shopping:'Shopping: the list is ready. Ask what the first item is for the selected pet, or what is next if it already has items. Do not ask the owner to create a list or present topic menus. Speak naturally and take the lead. Once a product is clear, use research_shopping proactively to compare current prices and locations against saved stores and preferences. If essential product details or location are missing, ask one short question, using the profile and conversation to avoid repeats. When the owner just wants an item saved, use add_shopping_items to offer confirmation without delaying it for research. Never claim an item is saved until confirmed. Use shoppingSuggestions only for useful specific suggestions, not repetitive catalogues. Never send the user to Google to do the comparison themselves. Follow the shopping research instructions for evidence and recommendations.',
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
