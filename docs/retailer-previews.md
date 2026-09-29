# Retailer concept branches

The `mobile` branch keeps the original Your Pet Care identity. `petstock`, `petbarn` and `petsonline` inherit its worldwide maps, Pip conversations, confirmations, profiles, calendar and shopping lists. Each branch owns `mobile/src/retailer.json`, `retailer-assets.ts` and `mobile/assets/retailer/`.

## Published routes

- Original: https://big-slick-games.github.io/yourpetcare/
- Petstock: https://big-slick-games.github.io/yourpetcare/home/petstock/
- Petbarn: https://big-slick-games.github.io/yourpetcare/home/petbarn/
- Pets Online: https://big-slick-games.github.io/yourpetcare/home/petsonline/

One Pages workflow builds all four branch tips and publishes a combined artifact. Every deployment includes all versions, preventing one branch from erasing another. Expo base URLs match these directories; route navigation, refreshes and bundled assets stay under the selected version. Native identifiers are distinct for future signed builds; this does not submit anything to app stores.

## Research and implementation

Reviewed 30 September 2026. Colours below were observed in the actual website and computed browser styles, not taken from a supplied brand manual. Supporting screen captures and raw observations are in the local `artifacts/retailer-research/` directory.

### Petstock

Navy `#002855`, cyan `#00afe4`, magenta Foundation accents and the multicolour logo bars. The official [Buddy page](https://www.petstock.com.au/pages/buddy) identifies its longstanding dog character and Foundation toy range. The branch includes the official white logo on navy, Buddy history imagery and linked Foundation toys. It also links to [veterinary care](https://www.petstock.com.au/pages/petstock-vet), [grooming](https://www.petstock.com.au/pages/grooming), [puppy school](https://www.petstock.com.au/pages/puppy-school) and [Caribu horse rugs](https://www.petstock.com.au/collections/caribu-summer-collection).

### Petbarn

Yellow `#ffc226`, near-black `#191919`, white and warm pale yellow. [Petey and Barnadette](https://www.petbarn.com.au/petey-and-barnadette) are the official dog and cat characters. Their original imagery accompanies the current Petbarn logo. Product discovery links to [Leaps & Bounds](https://www.petbarn.com.au/c/dogs/brand/leaps-bounds), [FURminator](https://www.petbarn.com.au/c/dogs/brand/furminator) and the [Whistler fruit treat bar](https://www.petbarn.com.au/p/whistler-health-bar-fruit-cockatiel-lovebird-treat). Services and vet links use Petbarn's published pages.

### Pets Online

Teal `#58b9b5`, dark blue `#272f46` and muted blue `#536d8b`. The [official site](https://petsonline.com.au/) is a pet directory and editorial guide site, not a verified direct retail inventory. No named mascot was found on the reviewed home/about pages; Pip remains the original YPC guide rather than inventing an official character. This branch features the original logo, breed/adoption discovery and linked [kennel](https://petsonline.com.au/buying-guides/dog-kennels/), [litter-box](https://petsonline.com.au/buying-guides/cat-litter-boxes/) and [harness](https://petsonline.com.au/buying-guides/dog-harnesses/) guides with the images shown on its homepage.

## Integration boundaries

These are labelled Your Pet Care concepts and use the existing YPC backend/account. They are not retailer authentication, order, payment, stock or booking integrations. Product links open the official sites; prices and availability are not fabricated. Adding an idea opens the existing shopping-list flow for the user to choose and save. Pip remains the conversational AI, with retailer characters presented as brand characters. No changes are made to users' preferred stores automatically.

Logos and character/product imagery remain the respective owners' assets; source pages and image provenance are recorded per branch in `mobile/assets/retailer/sources.json`. Branded concept pages use noindex. Original YPC design and credentials remain intact.
