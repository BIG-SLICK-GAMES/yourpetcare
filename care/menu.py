"""Front-door destinations. Every tile is a normal link, with decorative motion."""
ITEMS = [
    ('map', 'Explore the map', '/find-care/', 'Find a place for every kind of companion', 'blue'),
    ('pets', 'My pets', '/pets/', 'Your favourite little characters', 'peach'),
    ('sports', 'Activities', '/life/?category=sports', 'Catch a little adventure', 'mint'),
    ('training', 'Training', '/life/?category=training', 'Small wins, happy tails', 'lilac'),
    ('cafe', 'Cafés & dining', '/life/?category=cafes', 'A table for you and your best friend', 'butter'),
    ('hotel', 'Pet-friendly stays', '/life/?category=stays', 'Dream somewhere new', 'blue'),
    ('road', 'Road trips', '/life/?category=roadtrips', 'Windows down, adventure ahead', 'rose'),
    ('flight', 'Flying together', '/life/?category=flying', 'Get ready for take-off', 'blue'),
    ('outdoors', 'Parks & outdoors', '/life/?category=outdoors', 'Follow a new sniff', 'mint'),
    ('play', 'Play & enrichment', '/life/?category=enrichment', 'Make room for a little fun', 'peach'),
    ('birthday', 'Little milestones', '/life/?category=milestones', 'Celebrate their little life', 'lilac'),
    ('calendar', 'Our calendar', '/calendar/', 'Something to look forward to', 'butter'),
    ('bell', 'Reminders', '/reminders/', 'A little nudge, then back to life', 'rose'),
    ('vet', 'Find care', '/find-care/', 'Good people, close by', 'mint'),
    ('health', 'Health & records', '/records/add/', 'Keep their story together', 'blue'),
    ('bowl', 'Food & supplies', '/supplies/', 'Keep the good stuff coming', 'butter'),
    ('walk', 'Dog walking', '/community/help/', 'A walk makes a good day', 'peach'),
    ('sitting', 'Pet sitting', '/community/help/', 'Company when you’re away', 'lilac'),
    ('rescue', 'Pounds & rescue', '/community/rescue/', 'A new home, or a way home', 'mint'),
    ('giving', 'Charities', '/community/giving/', 'Share a little love', 'rose'),
    ('farewell', 'Saying goodbye', '/community/farewell/', 'Gentle support, at your pace', 'sand'),
    ('service', 'Share your service', '/services/add/', 'Put your caring hands up', 'butter'),
    ('community', 'Community', '/community/', 'A whole world of pet people', 'blue'),
    ('care', 'Everyday care', '/today/', 'The little things, looked after', 'peach'),
    ('settings', 'Preferences', '/settings/', 'Make yourself at home', 'lilac'),
]

CATEGORIES = [
    ('my-pets', 'My Pets', 'Their little world, all together.', ['pets', 'calendar', 'bell', 'settings']),
    ('fun', 'Fun Together', 'A new sniff, a new skill, a really good day.', ['sports', 'training', 'play', 'outdoors', 'birthday']),
    ('extra', 'Extra Care', 'A helping hand, whenever you need one.', ['sitting', 'walk', 'service', 'rescue', 'giving', 'community', 'farewell']),
    ('healthy', 'Healthy Pets', 'The care that keeps life feeling good.', ['vet', 'health', 'bowl', 'worming', 'flea', 'vaccination', 'care']),
    ('out', 'Out & About', 'Little outings and big adventures.', ['map', 'cafe', 'hotel', 'road', 'flight']),
]
ALIASES = {
    'map': 'map maps nearby near me location find search suburb postcode horse equine birds avian reptiles exotics amphibians fish animals',
    'pets': 'profile animal dog cat kitten puppy companion birthday age',
    'sports': 'sport sports activity activities agility frisbee exercise games',
    'training': 'train trainer learning puppy obedience behaviour behavior tricks',
    'play': 'play toys enrichment indoor games boredom',
    'outdoors': 'park parks outside outdoors nature walk walking beach',
    'birthday': 'birthday birthdays celebration gotcha anniversary milestone',
    'calendar': 'calendar schedule events appointment date plan',
    'bell': 'reminder reminders alert notification snooze',
    'settings': 'settings preferences account reset privacy timezone',
    'sitting': 'sitter sitting babysitting boarding minding day care overnight',
    'walk': 'walker walkers walking walking service dog walker',
    'service': 'business list listing offer advertise services pet sitting walking funeral',
    'rescue': 'adopt adoption pound pounds rescue shelter lost missing found rehome',
    'giving': 'charity charities donate donation volunteer guide dogs delta therapy dogs',
    'community': 'community support people help groups',
    'farewell': 'funeral cremation goodbye grief loss death died memorial farewell',
    'vet': 'vet vets veterinarian veterinary clinic clinics doctor emergency',
    'health': 'health records weight documents vaccination medical history allergy',
    'bowl': 'food feeding feed diet nutrition supplies stock reorder shopping',
    'worming': 'worm worms worming deworm deworming intestinal parasite parasites treatment',
    'flea': 'flea fleas tick ticks parasite prevention treatment',
    'vaccination': 'vaccine vaccines vaccination vaccinations booster boosters immunisation',
    'care': 'routine routines everyday care overdue tasks',
    'cafe': 'cafe café cafes dining dinner dinners restaurant restaurants lunch breakfast brunch eating coffee',
    'hotel': 'hotel hotels accommodation stay stays weekend away lodging holiday holidays',
    'road': 'road trip trips roadtrip car driving travel travelling traveling journey holiday',
    'flight': 'fly flying flight flights airplane aeroplane airline airport plane travel travelling overseas',
}


def grouped_menu(query='', category='all'):
    import unicodedata
    import difflib
    def normalize(value):
        return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold()) if not unicodedata.combining(c))
    items = {key: dict(icon=key, label=label, url=url, hint=hint, color=color) for key,label,url,hint,color in ITEMS}
    items['vet'].update(label='Vets & clinics', url='/find-care/?category=vet')
    for key,label in [('worming','Worming'), ('flea','Flea & tick care'), ('vaccination','Vaccinations')]:
        items[key] = dict(icon='care', label=label, url='/tasks/add/?kind='+('flea' if key=='flea' else key), hint='Keep their care dates in one place', color='mint')
    tokens = normalize(query).split()
    groups = []
    vocabulary = set()
    for slug,title,intro,keys in CATEGORIES:
        entries = []
        for key in keys:
            text = normalize(' '.join([items[key]['label'], title, ALIASES.get(key,'')]))
            vocabulary.update(text.split())
            if all(token in text for token in tokens):
                entries.append(dict(items[key], key=key))
        if entries and (query or category == 'all' or category == slug):
            groups.append(dict(slug=slug, title=title, intro=intro, items=entries))
    suggestion = ''
    if query and not groups:
        corrected = [difflib.get_close_matches(t, sorted(vocabulary), n=1, cutoff=.72) for t in tokens]
        proposal = ' '.join(c[0] if c else t for t,c in zip(tokens,corrected))
        if proposal != normalize(query):
            suggestion = proposal
    return groups, suggestion
