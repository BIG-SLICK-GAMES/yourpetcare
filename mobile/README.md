# Your Pet Care mobile

Expo 57, React Native and Expo Router, with native Android/iOS screens and a web preview. This is a fresh mobile implementation on the `mobile` branch; the Django app remains available separately.

## Run and check

Node 22.13 or newer:

```sh
cd mobile
npm ci
cp .env.example .env
npm start
npm run typecheck
npm run lint
npm run export:web
npm run check:native
```

The example API URL connects to the owner's deployed EC2 API. Accounts created there are real development accounts. `EXPO_PUBLIC_API_URL` is public configuration; never put API keys or database credentials in the mobile app.

## Included

- Browsing without login; conversational four-step pet setup for 13 animal types, illustrated species choices, age, skills, comfort and goals.
- Conversation-first home: one question, a tap-to-talk microphone, optional typing, short replies and inline Confirm / Change / Cancel cards. Older messages stay behind Earlier messages. Pet setup can happen in chat. Map, pets and calendar remain available in the bottom navigation.
- Voice records up to 30 seconds, transcribes through the backend, and reads replies with the device speech service. Recording is opt-in and stops on navigation/backgrounding; temporary recordings are deleted. This is turn-based voice, not continuous real-time audio.
- Searchable directory, clustered map, saved services, plans and recurring calendar tasks.
- Every proposed pet, calendar or saved-service change requires separate Confirm / Change / Cancel review. Proposals expire after 30 minutes; repeated confirmations cannot duplicate changes.
- Account signup/login, export and deletion. Native tokens use SecureStore; the web preview keeps tokens only in memory, so refreshing signs out.
- Optional local device reminders for the next 50 occurrences, including repeats even if an earlier task was not completed. Account refresh replenishes the window; reopen regularly. Native delivery needs device verification; web preview does not send notifications. Repeats use elapsed days, not timezone-aware recurrence; check times after travel or DST changes. Calendar completion advances its recorded occurrence.
- AI integration through the backend Responses API, with explicit context-sharing consent. The companion uses per-pet memory and care gaps to guide one question at a time. It can propose profile/care-note changes, a preferred directory vet, meal routines (profile plus two daily calendar entries), plans, saved services and completed events. Confirm/cancel results are recorded as explicit conversation receipts. Walking requests link to Map ? Walking routes. It cannot execute a write on its own. The admin portal can save an encrypted API key and test the connection; until configured, the app shows connection pending. Weather and park occupancy are unavailable, and the agent must not invent them.
- Existing 21 Holdem staff authentication for pet-care user search and confirmed suspend/restore, including session revocation and an audit record. Portal: https://admin.21-holdem.com/pet-care/ (sign into the existing admin first).

The directory contains public source information, not verified live availability or bookings. Map tiles use OpenStreetMap; the native map uses a small Leaflet WebView. Other primary app screens are native views.

## Store builds

`eas.json` contains development, internal preview and production profiles. Link this project to the owner's Expo account, confirm the provisional `com.yourpetcare.mobile` identifiers, then use EAS Build for signed iOS and Android builds. Apple/Google developer membership, signing, store records and submission credentials remain to be configured. No signed binary or store submission has been made.

Before a public store release: test both physical platforms (including permissions, reminder scheduling and account deletion); configure live AI and evaluate conversation/action safety; add account recovery and a real support contact; finish privacy/retention and store disclosures; harden database permissions; and prepare store artwork and review notes. JavaScript export success is not a substitute for native build/device testing.

The mobile rebuild has not yet ported photo upload/admin moderation, service submissions, detailed health/supply records, full web calendar views or existing local web users. It uses the illustrated pet library for now. Advertising is a reserved placeholder only. No tracking SDK is included.

## Backend and deployment

See [operations](../deploy/mobile/README.md). `mobile-server/test` covers ownership, proposal confirmation, cancellation/expiry, repeated actions, AI validation and admin authorization. Run `node --test mobile-server/test/*.test.js` from the repository root. No key is needed for these tests; AI responses are mocked.

The GitHub Actions workflow publishes this branch's static web export to GitHub Pages. It does not run the backend or automatically deploy EC2 changes.

Dependency review currently reports 14 moderate transitive/toolchain findings. npm proposes incompatible Expo/Router downgrades for most; those were not forced. Recheck upstream fixes before release.

Walking maps use FOSSGIS?s OSRM pedestrian graph, show real path geometry, distance, time and alternatives when returned. Owners choose both points; no loops, dog access or quietness are guaranteed. Public requests are limited globally to one per 1.1 seconds for the current single-process deployment. FOSSGIS logs supplied coordinates. This shared service is for light usage; arrange dedicated routing capacity before scaling.

Run `npm test` in mobile for recurring notification-window regression coverage. The home conversation starters are a horizontally scrolling circle-icon row immediately above text input.

Outing planning asks for a total time budget and rest/cafe/dog-park preference, then looks for nearby stops and draws a real out-and-back foot route. It shows walking plus suggested break time, warns when over budget, and prefills calendar details so only the date/time is needed. Dog preparation includes water/lead/poo bags; cafe treats are suggestions unless explicitly sourced.

`mobile-server/src/outing-places.json` is a 27 Sep 2026 snapshot of Brisbane City Council park-locations and park-dog-off-leash-areas (https://data.brisbane.qld.gov.au/), with three independently sourced dog-welcoming cafe records. Venue policies link to official websites; coordinates are from venue metadata or OpenStreetMap address lookup and may be approximate. Attribute Council, venues and OpenStreetMap. Cafe coverage is limited. Outside snapshot coverage, a cached, throttled public Overpass lookup is attempted and may be unavailable. It never fabricates listings or dog access.

Pip leads a full-screen first-pet introduction with no app header or tabs. Speech bubbles explain reminders, currently listed services and outings before asking for a name, species and first care goal. Age and personality can be learned later. Tap Pip to hear the current bubble with device speech; credentials are never spoken. Guests can begin immediately; account creation/sign-in asks for one field at a time and preserves answers during the visit. The server proposal is reviewed and explicitly confirmed before a pet is saved. A success receipt leads into a relevant real AI conversation with the normal consent prompt. Existing pets skip first-pet setup. Unfinished guest answers remain only in this screen's memory and are not retained after closing/reloading it.

Help is a library of nine animated demonstrations plus the original welcome film. Example messages type in, taps highlight controls, a marker moves across a sample map and results appear. Each film has three scenes, pause/back/next controls, and a final action into the app; watching never creates real data. Reduced motion and native screen readers use manual scenes. The animations pause in the background. Pip and the guides use local SVG/native UI, without video downloads.

Pip can read every help scene aloud on tap; playback pauses so the scene stays visible. Home is the centre tab, with a larger round glossy button. After onboarding, existing accounts open their dashboard with pet selection, the next three scheduled occurrences, places, planning and a direct link to chat. First-pet onboarding covers the app navigation until it is finished or skipped. The outlined Your Pet Care wordmark, paw-heart emblem and typeface license are in `assets/brand`; the mark is also used for the app icon and favicon.
