# Product positioning

## Proposition and user problem

**Your Pet Care remembers the things you shouldn't have to.**

Pet care is scattered across memories, messages, vet instructions, food bags, calendars and local services. Owners need help joining those fragments together, not another form to maintain. Your Pet Care is an intelligent companion for remembering, organising and acting. Pets are family; the tone should be supportive, practical and calm, including busy days, illness, ageing and farewell care.

Pip asks one useful question, reuses what is known, offers a concrete next step and explains what changed. Optional details stay optional. The owner controls decisions. ?An operating system for caring for your pet, with an intelligent companion on top? is an internal direction, not a claim that every integration is already complete.

## Capability truth table

| Capability | Public Expo prototype | Earlier Django app / future direction |
| --- | --- | --- |
| Profile and routines | Name/type, optional details, care notes, preferred vet, meal routines | Richer identifiers, conditions and uploads exist in Django |
| Companion | Live server-configured OpenAI conversation, proposals, transcription and device speech | More structured context and longitudinal understanding planned |
| Schedule | Owner-confirmed events, reminders, day-interval repeats, completed-event list | Richer local-time recurrence and `.ics` export exist in Django; external sync is not connected |
| Health history | Free-text care notes and completed care events; no dedicated vaccination or weight table | Structured records, vaccinations, treatments and dated weights exist in Django, not yet integrated into the public app |
| Supplies | Preferred stores, reviewed offer feed and sale reminders | Stock, consumption estimates and supply timeline exist in Django; public shopping/stock workflow remains planned |
| Local help | Map, sourced listings, filters, favourites, preferred vet, directions and visit planning | No booking, invented rating or live availability service |
| Reminders | Native local scheduling; browser calendar; needs real-device validation | Background push and continuous monitoring are not connected |
| Privacy | Consent, owner-scoped data, export, deletion and optional remembered sign-in | Account recovery and production retention/support work remain |

AI availability is runtime configuration. As checked on 29 September 2026, the public API reports it enabled. A connection failure must not be hidden behind canned replies that pretend to be live AI.

## Companion architecture

Two explicitly separate paths share the same product idea:

**Live:** selected account and pet ? `agentFacts` in `pet-context.js` ? existing response provider in `agent.js` ? pure proposal adapter in `agent-actions.js` ? server/domain validation ? review ? explicit owner confirmation ? atomic account update and receipt.

**Example:** immutable fictional context ? deterministic rules ? typed notices ? sandbox reducer ? demo schedule/shopping/history. `CompanionPreview` renders these values using existing cards and icons. Its module has no API, account, token or storage dependency. Repeated actions are idempotent by notice ID and action kind. The example is resettable and disappears when unmounted. It cannot create real reminders or affect another pet.

The small preview provider interface is synchronous today; a later response service can supply the same notice/action shape. Do not wire demo actions into real account execution. Any future migration must map supported actions through the server proposal boundary, with owner checks, freshness checks and explicit consent. Backend dependency injection already allows replacing `askAgent`; no second AI backend is needed.

## How features connect

Today, an owner records a care event ? the care schedule shows it ? Pip can use upcoming events in a conversation ? Care Around You finds relevant help ? a listing can prefill a visit ? confirmation saves a calendar entry ? marking complete adds it to completed events. This is a care log, not a verified clinical vaccination history.

The labelled preview demonstrates the next level: a supplied treatment due date plus one dose remaining produces a notice; a demo action enters a sandbox reminder or shopping list. A separate vaccination example opens a real, vet-filtered map only when the user explicitly chooses to browse it. An example food estimate divides entered remaining grams by entered daily usage and states both inputs. No treatment interval or diet is prescribed.

## Care Around You

?When your pet needs something, find the right place nearby.?

The map is an action destination, not the product's whole identity. Connect care needs to vets, shops, parks, dining, accommodation, boarding, sitters, trainers, rescue, charities and farewell providers. Retain sources and animal-coverage qualifications. Do not equate a pin with verification, endorsement, current opening hours, an appointment or emergency availability. Choosing Plan a visit records the owner's plan; contact the provider to book.

## Trust principles

- Use real saved facts or clearly labelled fictional examples. Never mix them silently.
- Ask before sharing with the live AI service; disclose selected-pet and conversation context, routines, stores and relevant directory data.
- Separate advice, proposed actions and confirmed results. No autonomous account changes or purchases.
- Keep data export and account deletion discoverable. Explain local sign-in storage and demo isolation plainly.
- Treat medical records as owner/vet information. Encourage veterinary help for concerns; do not diagnose or change treatment.
- No invented dates, stock, ratings, weather, crowds, booking success or partner status.
- Design for keyboard, small screens, reduced motion and a clear route Home. Keep Pip, the curved wordmark, palette, icon language and existing feature breadth.

## Roadmap

1. **Presentation and reliability:** truthful README, concise proposition, isolated companion preview, How it works, connected map/plan entry points, clear privacy and device testing.
2. **Structured care migration:** design an owner-approved migration for Django health records, vaccinations, treatments, weights, documents and supply quantities. Retain provenance and dates; never infer missing history.
3. **Richer companion context:** selected history and trends, appointment preparation and explainable stock estimates. Explicitly distinguish owner facts from estimates and model suggestions.
4. **Delivery and integrations:** reliable background notifications, external calendar integration and provider workflows only after permission, operational support and truthful status reporting.
5. **Public store readiness:** recovery, support, retention, accessibility/device testing, signing, privacy declarations and submissions.

A useful future conversation is ?What needs attention this month?? with a short, sourced answer and a reviewable next step. Success is less remembering for the owner, not more forms or more AI for its own sake.
