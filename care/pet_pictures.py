PICTURES = [
    ('dog', 'Dog', 'dog puppy labrador retriever terrier poodle spaniel canine'),
    ('cat', 'Cat', 'cat kitten tabby feline'),
    ('horse', 'Horse / pony', 'horse pony equine shetland'),
    ('bird', 'Cockatiel', 'bird cockatiel cockatoo parrot budgie avian'),
    ('parrot', 'Parrot', 'bird parrot macaw lorikeet avian'),
    ('lizard', 'Lizard', 'reptile lizard bearded dragon gecko skink'),
    ('snake', 'Snake', 'reptile snake python serpent'),
    ('turtle', 'Turtle', 'reptile turtle tortoise'),
    ('rabbit', 'Rabbit', 'rabbit bunny'),
    ('guinea-pig', 'Guinea pig', 'guinea pig cavy small mammal'),
    ('hamster', 'Small mammal', 'hamster mouse rat gerbil small mammal'),
    ('fish', 'Fish', 'fish goldfish betta aquarium'),
    ('frog', 'Frog', 'frog amphibian toad'),
    ('axolotl', 'Axolotl', 'axolotl amphibian salamander'),
    ('goat', 'Goat', 'goat farm companion'),
    ('insect', 'Stick insect', 'insect invertebrate phasmid stick insect'),
]


def picture_matches(query):
    terms=query.casefold().split()
    return [{'key':key,'label':label,'path':f'pet-pictures/{key}.svg'} for key,label,aliases in PICTURES if all(term in aliases for term in terms)]
