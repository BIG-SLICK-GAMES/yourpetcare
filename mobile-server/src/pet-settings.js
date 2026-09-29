import {Problem} from './domain.js';
export const petSettingCategories={
  "health": {
    "title": "Vet & health",
    "icon": "heart",
    "mapCategory": "vet",
    "fields": {
      "conditions": "Health conditions",
      "allergies": "Allergies",
      "medications": "Vet-provided medication instructions",
      "supply": "Treatment supply remaining (amount and date)",
      "microchip": "Microchip number",
      "insurance": "Insurance details"
    }
  },
  "feeding": {
    "title": "Food & meals",
    "icon": "food",
    "mapCategory": "shop",
    "fields": {
      "food": "Usual food",
      "portions": "Portions and feeding routine",
      "supply": "Food remaining (amount and date)",
      "dailyUse": "Daily food used (amount and unit)",
      "restrictions": "Treats and food restrictions"
    }
  },
  "walks": {
    "title": "Walks & exercise",
    "icon": "paw",
    "mapCategory": "park",
    "fields": {
      "duration": "Comfortable duration",
      "frequency": "Usual frequency and times",
      "preferences": "Favourite routes and preferences",
      "limits": "Exercise limits from your vet"
    }
  },
  "dining": {
    "title": "Dining out",
    "icon": "food",
    "mapCategory": "cafe",
    "fields": {
      "experience": "Outing experience",
      "seating": "Seating and space preferences",
      "settling": "What helps them settle"
    }
  },
  "parks": {
    "title": "Parks & outdoors",
    "icon": "tree",
    "mapCategory": "park",
    "fields": {
      "preferences": "Favourite spaces",
      "comfort": "Company, confidence and boundaries"
    }
  },
  "activities": {
    "title": "Play & training",
    "icon": "play",
    "mapCategory": "trainer",
    "fields": {
      "favourites": "Favourite games and activities",
      "goals": "Skills and training goals"
    }
  },
  "grooming": {
    "title": "Grooming",
    "icon": "groom",
    "mapCategory": "groomer",
    "fields": {
      "routine": "Grooming routine",
      "handling": "Handling preferences"
    }
  },
  "travel": {
    "title": "Travel & stays",
    "icon": "plane",
    "mapCategory": "hotel",
    "fields": {
      "transport": "Travel preferences",
      "equipment": "Carrier and travel supplies",
      "stays": "Accommodation needs"
    }
  },
  "carers": {
    "title": "Sitters & carers",
    "icon": "person",
    "mapCategory": "sitter",
    "fields": {
      "contacts": "Trusted carers and contact details",
      "instructions": "Care and handover instructions"
    }
  },
  "home": {
    "title": "Home & habitat",
    "icon": "home",
    "mapCategory": null,
    "fields": {
      "habitat": "Home or habitat needs",
      "rest": "Sleep and rest routine",
      "comfort": "What helps them feel safe"
    }
  },
  "emergency": {
    "title": "Emergency care",
    "icon": "care",
    "mapCategory": "vet",
    "fields": {
      "contact": "Emergency clinic and contact",
      "instructions": "Emergency care instructions"
    }
  }
};
export function preparePetSettings(pet,input){
  const category=input?.category;
  if(typeof category!=='string'||!Object.hasOwn(petSettingCategories,category))throw new Problem('Choose a pet settings category.');
  const fields=petSettingCategories[category].fields,values=input.values;
  if(!values||typeof values!=='object'||Array.isArray(values)||!Object.keys(values).length)throw new Problem('Choose settings to save.');
  const patch={};
  for(const [field,value] of Object.entries(values)){
    if(!Object.hasOwn(fields,field)||typeof value!=='string'||value.trim().length>800)throw new Problem('Check your pet settings. Keep each detail under 800 characters.');
    patch[field]=value.trim();
  }
  return {category,values:{...(pet.careSettings?.[category]||{}),...patch}};
}
