# Your Pet Care

**Your Pet Care remembers the things you shouldn't have to.**

An intelligent pet-care companion that helps owners remember, organise and act on what their pets need. Pip connects conversations, pet profiles, routines, plans and nearby help, with the owner in control of every saved change.

## Current status

Your Pet Care is a publicly accessible prototype deployed through GitHub Pages, backed by an EC2 API and MongoDB. It is not yet an App Store or Google Play release.

- [Open the live prototype](https://big-slick-games.github.io/yourpetcare/)
- [Repository](https://github.com/Big-Slick-Games/yourpetcare) ? the `mobile` branch powers the public prototype.
- [Product positioning and roadmap](docs/PRODUCT_POSITIONING.md)
- [Mobile development guide](mobile/README.md) ? [API deployment](deploy/mobile/README.md)

Browse without signing in. Create a Your Pet Care account to save pets, plans, conversations and favourite places. Pet-owner accounts are separate from the existing game/admin identity system.

### Already implemented in the public prototype

- **Pip, your companion:** a live OpenAI-backed conversation and optional turn-based voice transcription, enabled by server configuration. Sharing requires consent. Pip receives the selected pet's profile, care notes, routines, upcoming events, selected care gaps, preferred vet, supplies-store preferences and directory context. It proposes changes; the owner confirms them.
- **Pet profiles:** multiple animal types; a short name/type introduction; optional age, breed, comfort, training and care notes; editing and confirmed removal. More details can be learned gradually.
- **Care schedule:** activities, appointments recorded as calendar events, reminders, meal routines, elapsed-day repeats and completed events. Planning supports category icons, maps and walking-route prefills. It does not make provider bookings or synchronise an external calendar.
- **Care Around You:** clustered map, search, animal-coverage filters, directions, favourites, preferred vets and links from places into plans. Categories include vets, supplies, parks, dining, accommodation, boarding, sitters, grooming, training, rescue, charities and farewell care. Listing coverage is incomplete and opening hours are not live.
- **Supplies:** preferred local stores and branch addresses, one reviewed retailer offer feed, and owner-confirmed sale reminders. This public app does not yet track stock, shopping lists or consumption.
- **Trust and access:** optional remembered sign-in, account export and password-confirmed deletion, private owner-scoped records, reduced motion, labelled controls, responsive navigation and Pip-led animated guides.

The public API reported AI enabled on 29 September 2026; runtime status is shown in the app. If the provider is unavailable, planning and browsing remain usable. Do not confuse this existing integration with the broader intelligence roadmap below.

### Prototype / simulated behaviour

The labelled companion preview uses a fictional Stormy profile, example owner-entered due dates and stock counts. Its treatment, vaccination and food notices are deterministic. Demo reminders, shopping entries and history stay in an isolated in-memory sandbox; they do not write to accounts, contact AI or create notifications. Reset clears them. A stock estimate is arithmetic on example quantities, not a feeding recommendation.

Help animations are illustrations, not saved actions. Directory and venue snapshots are sourced but not guarantees of suitability, availability or endorsement. Native local reminders exist in code but need physical-device verification; the web prototype does not send notifications. Offer checks run on app refresh, not continuously in the background. No live weather or crowd information, automatic purchases, ratings or booking service is connected.

### Existing depth in the earlier Django application

The repository also retains a separate Django/SQLite implementation with structured health records, vaccinations/treatments, dated weights, uploads, stock estimates, supply history, richer recurrence, appointment details, reminder processing, `.ics` export and listing-review workflows. These are working repository features, **not features already migrated into the public Expo app**. Existing Django records are not automatically available to Pip's live context.

See [the Django guide](docs/LEGACY_DJANGO.md), `care/models.py`, `care/services.py` and [operations](OPERATIONS.md). Nothing in that implementation is removed by the public prototype's positioning work.

### Planned intelligence layer

Bring structured health history, verified due dates, weight trends, stock, appointments and care completion into one owner-controlled context. The companion should connect an upcoming need to a useful next step: review a reminder, find a vet, prepare for travel or replenish supplies. Medical dates come from owners or veterinary instructions; the companion must not diagnose, prescribe or invent care schedules. The sandbox shows this direction without presenting it as live automation.

## Architecture

| Responsibility | Location |
| --- | --- |
| Shared phone/web UI and Pip | `mobile/src/app`, `Pip*`, `AnimatedHelp.tsx` |
| Isolated example context, rules, notices and demo reducer | `mobile/src/companion-preview.ts` |
| Live selected-pet context | `mobile-server/src/pet-context.js` |
| Existing AI response provider | `mobile-server/src/agent.js` |
| Response-to-proposal adapter | `mobile-server/src/agent-actions.js` |
| Validation, confirmation, ownership and idempotence | `mobile-server/src/domain.js`, `server.js`, repository layer |
| Earlier structured care system | `care/`, `templates/`, `static/` |

No model output directly mutates an account. A future provider must return the same validated proposal shape and retain the confirmation boundary.

## Run and verify

Use Node 22.13+ for Expo 57. Each application has its own dependencies.

```sh
cd mobile-server
npm ci
npm test
# Configure .env from .env.example for your own API/database, then npm start.
```

```sh
cd mobile
npm ci
# Copy .env.example to .env and choose EXPO_PUBLIC_API_URL.
npm start
npm test
npm run typecheck
npm run lint
npm run export:web
```

The example mobile API URL points at the deployed development service: accounts and writes there are real. Use a separate test API for disposable automated fixtures. Keep API keys and database credentials on the server; only the API base URL belongs in public configuration.

GitHub Actions tests and exports `mobile/dist`, preserving the `/yourpetcare` base path and static deep links, then deploys GitHub Pages. The EC2 API is deployed separately. The Django application has separate Python setup and tests in its guide.

## Privacy and release boundaries

Account records live in the dedicated MongoDB database. Passwords are hashed. Remember me stores a session token and username, not a password. Consent-based AI requests share relevant context with OpenAI; response storage is disabled in the API request, but provider retention policies still apply. Location/maps have third-party requests. Export and deletion are available under You; plain-language details are in Privacy.

Before store release: complete account recovery, public support/retention documentation, native device verification, store privacy declarations, release signing and submission. External calendar sync, remote push, background sale monitoring and structured medical/stock migration remain future work.
