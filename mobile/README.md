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
- Optional local device reminders for the next 50 events. Native reminders need device verification; web preview does not send notifications. Repeats advance by elapsed days when completed, not timezone-aware calendar recurrence.
- AI integration through the backend Responses API, with explicit context-sharing consent. The agent can propose plans, remember comfort preferences, save a service and complete an event. It cannot execute a write on its own. The admin portal can save an encrypted API key and test the connection; until configured, the app shows connection pending. Weather and park occupancy are unavailable, and the agent must not invent them.
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
