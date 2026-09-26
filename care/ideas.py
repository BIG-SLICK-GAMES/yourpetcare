"""Editorial planning starters, not training prescriptions or confirmed venue bookings.

Offsets are editable planning suggestions, never statutory/airline deadlines.
Official sources checked 26 September 2026; users must reconfirm for their trip.
"""
from django.utils import timezone

INTERESTS = [('training', 'Everyday training'), ('sports', 'Dog sports'), ('cafes', 'Cafés & restaurants'), ('stays', 'Pet-friendly stays'), ('roadtrips', 'Road trips'), ('flying', 'Flying together'), ('outdoors', 'Parks & outdoor time'), ('enrichment', 'Play & enrichment'), ('milestones', 'Birthdays & milestones')]
REMINDERS = [(10080, '1 week before'), (4320, '3 days before'), (1440, '1 day before'), (120, '2 hours before'), (30, '30 minutes before'), (0, 'At the start')]
SOURCES = {
    'qantas': ('Qantas Freight: domestic pet checklist', 'https://freight.qantas.com/en-au/help/support/domestic-pet-travel-checklist'),
    'virgin': ('Virgin Australia: pet travel options', 'https://www.virginaustralia.com/au/en/travel-info/specific-travel/pets/'),
    'return': ('DAFF: cats and dogs returning to Australia', 'https://www.agriculture.gov.au/cats-dogs/cats-dogs-returning-to-australia'),
    'sports': ('Dogs Queensland: getting into dog sports', 'https://www.dogsqueensland.org.au/owners/trialling-your-dog/'),
    'scent': ('Dogs Queensland: scent work', 'https://dogsqueensland.org.au/owners/trialling-your-dog/scent-work/'),
    'felons': ('Felons: official dog policy & venue details', 'https://felonsbrewingco.com.au/pages/contact-us'),
    'ovolo': ('Ovolo Brisbane: official hotel FAQs', 'https://ovolohotels.com/ovolo/thevalley/ask/'),
}


def step(key, title, days, note=''):
    return {'key': key, 'title': title, 'days': days, 'note': note}


IDEAS = {
    'training': {'title': 'A small training win', 'category': 'training', 'kind': 'training', 'icon': '✦', 'description': 'Pick one everyday skill you want to practise, and make a little time for it.', 'species': [], 'sources': [], 'steps': [step('goal', 'Choose one skill and how you will record progress', 1), step('kit', 'Prepare the space and your usual training supplies', 0)]},
    'scent': {'title': 'Try a scent-work introduction', 'category': 'sports', 'kind': 'sport', 'icon': '⌕', 'description': 'Explore a local introduction with a trainer or club. Ask about entry requirements and your dog’s comfort.', 'species': ['Dog'], 'sources': ['scent', 'sports'], 'steps': [step('club', 'Contact a club about a beginner introduction', 14), step('requirements', 'Confirm suitability, entry requirements and equipment', 7), step('pack', 'Pack the organiser’s requested kit', 1)]},
    'agility': {'title': 'Explore a dog sport', 'category': 'sports', 'kind': 'sport', 'icon': '⚑', 'description': 'Agility, rally, tricks or another club activity: start with a conversation about age, skills and suitable participation.', 'species': ['Dog'], 'sources': ['sports'], 'steps': [step('choose', 'Choose a sport and contact the organiser', 21), step('suitability', 'Ask about age, fitness, skills and entry requirements', 14), step('confirm', 'Confirm the session and equipment list', 3)]},
    'cafe': {'title': 'A café date, together', 'category': 'cafes', 'kind': 'outing', 'icon': '☕', 'description': 'Choose somewhere that welcomes your dog, with the space and atmosphere that suit them.', 'species': ['Dog'], 'sources': ['felons'], 'steps': [step('policy', 'Confirm dog rules, seating and quieter times', 2), step('pack', 'Pack water, a bowl, lead and clean-up supplies', 0)]},
    'hotel': {'title': 'A pet-friendly night away', 'category': 'stays', 'kind': 'travel', 'icon': '⌂', 'description': 'Keep pet-room confirmation, fees, house rules and packing in the same plan.', 'species': [], 'sources': ['ovolo'], 'steps': [step('policy', 'Ask about your pet’s species, size and room restrictions', 21), step('book', 'Confirm the pet booking, fees and cancellation terms', 14), step('routine', 'Plan meals, care and permitted spaces during the stay', 3), step('pack', 'Pack food, care supplies, bedding and booking details', 1)]},
    'roadtrip': {'title': 'Hit the road with your pet', 'category': 'roadtrips', 'kind': 'travel', 'icon': '↗', 'description': 'Bring the route, rest stops, overnight stays and your pet’s routine into one itinerary.', 'species': [], 'sources': [], 'steps': [step('route', 'Plan the route, suitable breaks and overnight stops', 14), step('transport', 'Check your pet’s transport setup and comfort', 7), step('stock', 'Check food, prescribed care supplies and local contacts', 3), step('pack', 'Pack records, water, bedding and clean-up supplies', 1)]},
    'flight': {'title': 'Prepare for a domestic flight', 'category': 'flying', 'kind': 'travel', 'icon': '✈', 'description': 'Organise eligibility checks, carrier arrangements, documents and handover details before departure.', 'species': [], 'sources': ['qantas', 'virgin'], 'steps': [step('eligibility', 'Confirm airline acceptance for this pet, route and date', 42, 'Ask about species, breed, age, health, carrier dimensions, weight and available travel options. This checklist does not approve eligibility.'), step('vet', 'Discuss travel suitability and required documents with your vet', 28), step('carrier', 'Confirm the carrier rules and plan familiarisation', 21), step('booking', 'Record your pet’s confirmed booking and transfer arrangements', 14), step('documents', 'Check the carrier’s current documents and drop-off instructions', 3), step('conditions', 'Reconfirm conditions, terminal and collection contact', 1)]},
    'international': {'title': 'Plan an overseas journey', 'category': 'flying', 'kind': 'travel', 'icon': '◎', 'description': 'Start with official destination and return-to-Australia requirements, before committing to travel.', 'species': [], 'sources': ['return', 'qantas', 'virgin'], 'steps': [step('research', 'Check official destination and return-to-Australia requirements', 210, 'Start before booking. These suggested dates are organisational placeholders, not biosecurity deadlines; some requirements take many months.'), step('specialist', 'Build a dated requirements plan with a vet and transport specialist', 180), step('permissions', 'Confirm permits, testing, documents and quarantine arrangements', 120), step('transport', 'Confirm pet transport and accommodation bookings', 60), step('documents', 'Review every official deadline against your agreed itinerary', 14), step('handover', 'Reconfirm handover, arrival and collection instructions', 1)]},
    'outdoors': {'title': 'A change of scenery', 'category': 'outdoors', 'kind': 'outing', 'icon': '♧', 'description': 'Plan a park visit or outdoor outing around access rules, conditions and your pet’s comfort.', 'species': [], 'sources': [], 'steps': [step('access', 'Check animal access, lead rules and facilities', 3), step('conditions', 'Check conditions and choose a suitable time and route', 1), step('pack', 'Pack water and your usual outing supplies', 0)]},
    'enrichment': {'title': 'Make room for play', 'category': 'enrichment', 'kind': 'outing', 'icon': '♡', 'description': 'A familiar game, quiet exploration or a new pet-appropriate activity. Record what they enjoy.', 'species': [], 'sources': [], 'steps': [step('activity', 'Choose an activity suited to your pet and space', 1)]},
    'birthday': {'title': 'Celebrate their little milestones', 'category': 'milestones', 'kind': 'celebration', 'icon': '✳', 'description': 'A birthday, gotcha day or training milestone. Make space for a photo and something they enjoy.', 'species': [], 'sources': [], 'steps': [step('choose', 'Choose a pet-appropriate way to celebrate', 7), step('photo', 'Make a little time for a photo or memory', 0)]},
    'custom': {'title': 'Make your own plan', 'category': 'enrichment', 'kind': 'outing', 'icon': '＋', 'description': 'Start with a date and add the little steps that matter to you.', 'species': [], 'sources': [], 'steps': []},
}

LOCAL_STARTERS = [
    {'name': 'Felons Brewing Co.', 'area': 'Howard Smith Wharves, Brisbane', 'policy': 'The venue’s FAQ welcomes dogs in outdoor areas, not indoors, and asks owners to consider the busy setting.', 'source': SOURCES['felons'][1], 'template': 'cafe', 'species': ['Dog']},
    {'name': 'Ovolo Brisbane, Fortitude Valley', 'area': 'Fortitude Valley, Brisbane', 'policy': 'The hotel advertises a V.I.Pooch option. Ask the hotel about your dog, eligible rooms, fees and availability before booking.', 'source': SOURCES['ovolo'][1], 'template': 'hotel', 'species': ['Dog']},
]

# Planning prompts, not prescriptions or an assessment of an animal's suitability.
IDEAS.update({
    'horse-time': {'title':'A little horse time', 'category':'enrichment', 'kind':'outing', 'icon':'♡', 'description':'Make room for familiar company, grooming or an activity already suited to your horse. Your time together can be quiet, too.', 'species':['Horse'], 'sources':[], 'steps':[step('choose','Choose time together that fits your horse’s existing care plan',1)]},
    'bird-time': {'title':'A curious little bird moment', 'category':'enrichment', 'kind':'outing', 'icon':'♡', 'description':'Plan time to observe, interact or enjoy familiar enrichment suited to your bird. Keep a note of what catches their interest.', 'species':['Bird'], 'sources':[], 'steps':[step('choose','Choose familiar, species-appropriate enrichment with your bird’s carer',1)]},
    'habitat-time': {'title':'Their own little world', 'category':'enrichment', 'kind':'other', 'icon':'♡', 'description':'Spend a little time observing your companion and recording their habitat, behaviour or existing care routine. Small discoveries count.', 'species':['Reptile','Amphibian','Fish','Invertebrate'], 'sources':[], 'steps':[step('observe','Choose what you would like to observe or record',0)]},
    'small-friends': {'title':'Little companions, lovely moments', 'category':'enrichment', 'kind':'outing', 'icon':'♡', 'description':'Make time for familiar enrichment or quiet observation that suits your rabbit or small companion. Record the things they enjoy.', 'species':['Rabbit','Guinea pig','Small mammal'], 'sources':[], 'steps':[step('choose','Choose an activity appropriate to your companion and their space',1)]},
})


def suggestions(pet):
    result = []
    for key, original in IDEAS.items():
        if original['species'] and pet.species not in original['species']:
            continue
        if pet.species in ['Fish','Amphibian','Invertebrate','Reptile'] and key in ['hotel','roadtrip','flight','international','outdoors','training'] and original['category'] not in pet.interests:
            continue
        idea = dict(original, key=key, score=0, reason='Something you could plan together.')
        if pet.species not in ['Dog','Cat','Horse'] and key in ['hotel','roadtrip','flight','international','outdoors']:
            idea['reason'] = 'Start by checking whether this activity is appropriate for your species and accepted by the provider.'
        if original['category'] in pet.interests:
            idea.update(score=10, reason='Matches an interest you selected.')
        if key in ['horse-time','bird-time','habitat-time','small-friends']:
            idea.update(score=idea['score']+12, reason='A starting point for your kind of companion.')
        if pet.social_comfort in ['quiet', 'building'] and key in ['training', 'enrichment']:
            idea.update(score=idea['score'] + 3, reason='You said quieter settings or building confidence matter.')
        if pet.training_level in ['starting', 'basics'] and key == 'training':
            idea.update(score=idea['score'] + 3, reason='You said you’re working on everyday skills.')
        if pet.training_level == 'advanced' and original['category'] == 'sports':
            idea.update(score=idea['score'] + 2, reason='You recorded sport experience. Ask the organiser what fits next.')
        if pet.date_of_birth and (timezone.localdate() - pet.date_of_birth).days < 365 and original['category'] == 'sports':
            idea['reason'] = 'Your recorded birthday is under a year ago. Ask the organiser about minimum ages and suitable introductions.'
        if pet.energy_level == 'gentle' and key == 'enrichment':
            idea.update(score=idea['score'] + 3, reason='You selected a preference for gentler days.')
        result.append(idea)
    return sorted(result, key=lambda x: -x['score'])
