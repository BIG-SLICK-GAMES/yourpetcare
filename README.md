# Your Pet Care

A responsive, independent pet-care web app for Australia. Built locally in `E:\yourpetcare`. It has no BSG dependencies, accounts, services, database connections or Git remotes. GitHub and public deployment are deferred at the owner's request.

## Open preview and guided journey

The current local installation opens at **http://127.0.0.1:8000** without a login. Its front page is a playful menu of 27 illustrated shortcuts in My Pets, Fun Together, Extra Care, Healthy Pets and Out & About, including activities, travel, care, sitting/walking, charities and farewell services. Each icon has a short scene on hover or keyboard focus, such as a dog jumping for a frisbee. On touch screens one tap briefly animates, then opens the destination. A persistent pause control and reduced-motion support are included. The guided conversation asks one question at a time, allows optional answers to be skipped, and suggests three activities. Choose a day and time to add an event with reminders; preparation is opt-in. The full calendar and care tools remain available.

`YPC_LOCAL_PREVIEW=true` enables separate passwordless browser workspaces, on loopback requests and any explicitly configured `YPC_PREVIEW_NETWORKS`. Existing signed-in accounts remain separate. Preview sessions last 30 days; cookies are needed to return to the same workspace. Expiry does not delete database records. Preferences offers an explicit reset that removes that preview’s private records, uploads and submissions. Disabling preview or accessing it outside the configured preview networks invalidates a preview session. Keep the setting false for hosting. No shared demo credentials or administrative privileges are granted.

Community information links directly to official sources for Brisbane/Moreton Bay pounds, AWLQ, Guide Dogs Queensland, Delta Therapy Dogs, Pets in Peace and Pet Angel. There is no partnership, booking, donation collection or automatic enrolment. Sitting, walking and farewell service introductions are saved privately to the existing review desk, with validation, consent and duplicate-submission protection; they are not automatically published or emailed.

## Run locally on Windows

Python 3.12 or newer is required.

```powershell
cd E:\yourpetcare
.\start.ps1
```

Open **http://127.0.0.1:8000**. The launcher creates an isolated virtual environment when needed, installs the locked dependencies, creates a local secret, applies database migrations, collects static files and runs the app plus a reminder worker. Stop with Ctrl+C. Keep the process running for reminders; a closed laptop cannot send them.

For manual setup:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.lock.txt
.\.venv\Scripts\python scripts/setup_local.py
.\.venv\Scripts\python run_local.py
```

Create a free account through the app. Optional sample data:

```powershell
.\.venv\Scripts\python scripts/setup_local.py --demo
```

Sample login: **demo / Local-Paws-2026!**. This is a non-admin, local-only account containing explicitly labelled Stormy and Mochi examples. It does not seed businesses, actual appointments or orders. Delete this account before any public release. Sample treatment intervals and quantities are test data, not advice.

To access the review desk, create your own independent administrator:

```powershell
.\.venv\Scripts\python manage.py createsuperuser
```

Then visit `/admin/`. No default admin credentials are installed. The pet-photo review screen exposes the pet name, animal type, owner and image; it does not expose health notes.

## Implemented

- Guided pet discovery: age, training, energy, social/travel comfort, interests, goals and support notes, with explained activity suggestions.
- Life together: training, scent work, sports, dining, stays, road trips, flights, overseas travel, outdoor time, enrichment and milestones. Plans create an event and selectable preparation tasks for each participating pet. Rescheduling moves pending preparation while preserving completed history; cancellation stops pending reminders.
- Owner-recorded booking status, custom preparation, official travel-policy links, sourced Brisbane venue starting points and community-mapped dog-welcoming dining, stays and parks.
- Monthly/agenda calendar, recurring previews, weekly/monthly/yearly routines, selectable week/day/hour reminders, one-hour snoozing and a dedicated reminder inbox.

- Persistent registration, login/logout, password change/reset, session authentication, CSRF protection, basic shared-database auth throttling and private owner-scoped records.
- Multiple pets, optional photos and profile details, preferred providers, care notes, identification, allergies and conditions.
- Overview with next care, overdue status, supply alerts and a pet timeline.
- Monthly calendar, pet/status filters, editable care, completion/skipping, notes, appointments, costs, follow-up tasks and calendar snapshot export (`.ics`).
- Repeating schedules in an owner-selected Australian time zone. The next occurrence is created when the current occurrence is completed or skipped. Scheduled local time is preserved over daylight-saving changes; missed occurrences remain due instead of silently disappearing.
- Supplies with pack size, entered quantities, supplier links, delivery lead time, user-entered scheduled usage and transparent stock estimates. Order links open an actual supplier URL; marking ordered, receiving with a new total count, correcting stock and snoozing all record timeline events.
- Health records, dated weights and trend display, observations, vaccinations, treatments, costs and linked follow-ups. Private PDF/PNG/JPEG documents and image-validated pet photos.
- Guest-accessible Leaflet map, suburb/postcode/location searches across Australia, service filters, markers connected to results, sourced provider details, telephone links, websites and directions. Provider references can be reused by pet profiles, supplies and appointments.
- OpenStreetMap geocoding and provider discovery with identification, shared throttling, caching, attribution, source URLs and graceful outage messages. Listings have no invented ratings, prices or availability. Unverified data is labelled; emergency filtering only includes checks recorded within seven days. No automatic “open now” claims.
- Business submissions, listing claims/corrections, owner-visible review status and a staff review queue. Approval requires a provider and review notes. Verification requires recorded evidence; edits retain before/after audit snapshots.
- In-app reminder generation and opt-in SMTP submission, per-occurrence delivery keys, weekly supply deduplication, local-time delivery preference and visible status history. Ambiguous email attempts are not automatically resent.
- Data export ZIP including original uploads, password-confirmed account deletion, consistent SQLite backup command, local assets, responsive navigation, focus/skip-link and reduced-motion support.
- Anonymous aggregate counters for active sessions, completion/skipping, provider website contacts and listing submissions. No advertising trackers or payment flow. Featured provider labels do not change distance sorting.

## Stack and boundaries

**Django 5.2 LTS + SQLite + server-rendered HTML/CSS + small vanilla JavaScript + Leaflet.** Django's built-in authentication, form validation, migrations and administration keep the private-record and review workflows in one understandable application. SQLite makes this local release durable and easy to back up. The UI needs no Node build service. Waitress runs on Windows; WhiteNoise serves bundled static assets. Fonts and Leaflet are self-hosted with licences.

Reference: [Django supported releases](https://www.djangoproject.com/download/), [Leaflet](https://leafletjs.com/), [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

All environment settings use the **`YPC_` prefix** to prevent accidental inheritance from other projects. See `.env.example`. `.env`, SQLite, uploads, backups, browser artifacts and the virtual environment are Git-ignored. Do not put them in a future repository.

`care/models.py` defines the records; `care/services.py` owns atomic task completion and stock updates; views always scope private queries by the logged-in owner. `care/discovery.py` handles public data. `care/management/commands/` holds reminders, sample data and backups. The database and private media live beneath `YPC_DATA_DIR` (the project directory locally).

## Verification

```powershell
.\.venv\Scripts\python manage.py test care
.\.venv\Scripts\python manage.py check
.\.venv\Scripts\python manage.py makemigrations --check --dry-run
```

Optional browser and dependency audit tools:

```powershell
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m playwright install chromium
.\.venv\Scripts\python scripts/browser_check.py
.\.venv\Scripts\python scripts/browser_journeys.py
.\.venv\Scripts\python scripts/browser_life.py
.\.venv\Scripts\python scripts/browser_visual_membership.py
.\.venv\Scripts\python -m pip_audit -r requirements.lock.txt
```

Run the server and create the sample account before browser checks. Browser screenshots and the page/viewport report are written to `artifacts/`, outside Git. `browser_check.py` reads sample records and searches real map data; `browser_journeys.py` creates a disposable QA account, exercises the flows and deletes it at the end. If interrupted, remove its clearly named `qa_...` test account. Automated backend tests use a separate temporary database and mocked provider fixtures; none of those businesses enter the local directory.

## Reminders and backups

The local launcher runs reminders once per minute. Manual generation:

```powershell
.\.venv\Scripts\python manage.py send_reminders
.\.venv\Scripts\python manage.py backup --output backups
```

To deliver email, configure an independent SMTP service with the `YPC_EMAIL_*` settings, a valid `YPC_DEFAULT_FROM_EMAIL`, and `YPC_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, then opt in through settings. Default local operation produces in-app reminders only. Password-reset email is printed locally by Django's console backend; it is not delivered. See [OPERATIONS.md](OPERATIONS.md) for delivery status and restoration procedures.

## Known limits and public-release work

- This is a **local working release**, not a hosted service. No external repository, hosting, email account, payment service or public domain was connected.
- The reminder process must run. SMTP submission is not inbox delivery; bounce receipts and push notifications are not integrated. An uncertain submission needs an operator check before retrying to avoid duplicates.
- Recurrence supports day intervals, weeks, calendar months and years. Create separate items for separate daily times. Future repeats are read-only calendar previews; completing/skipping creates the next stored occurrence. Stock projection uses entered schedules and does not infer consumption from health records.
- Calendar export is a one-time snapshot of stored events with alarms, not a two-way sync or subscribed feed; recurring previews are not exported. Adding a plan or appointment never books it with a provider.
- Preparation offsets are editable planning suggestions, not medical advice or legal/airline deadlines. Confirm current requirements with the linked authorities and providers. Dates use the account time zone; flight-segment time zones are not modelled. Participating pets are fixed after a plan is created to preserve its history.
- Public OpenStreetMap services have incomplete coverage and no availability guarantee. Requests are cached/throttled and providers are not independently verified on import. Default map tiles and explicit searches use the internet; there is no offline map cache. Use appropriately provisioned services for material production traffic.
- Ownership review is a human workflow; approval does not give a business automatic editing privileges. Emergency verification requires independent operator checking and expires from the filter after seven days.
- The local database/files rely on the machine's disk encryption and permissions. Public launch needs independent infrastructure, HTTPS, tested encrypted off-site backup/restore, SMTP/domain verification, log retention, a named privacy contact, security review and real-device accessibility testing. Move to PostgreSQL before multi-instance write workloads. Documents need a malware-scanning pipeline before accepting uploads from the wider public.
- Email verification and self-service account recovery without configured email are not implemented. Auth throttling is a baseline; configure trusted proxy/IP handling and perimeter rate limits before public launch.
- The install manifest provides a packaging starting point; no service worker caches private records. Android/iOS packaging is a later milestone.

## App stores and payments

For mobile release: deploy the independent HTTPS backend, build a Capacitor or native client with secure session handling, define deep links and push-device registration, test offline/error flows, use platform photo/document pickers, complete privacy disclosures and account-deletion requirements, run real-device accessibility/battery tests and submit through independent Apple/Google developer accounts. A web wrapper alone is not considered an app-store-ready product.

For payments: first define the premium features, exact prices and cancellation/refund rules. Then choose an independent payment processor and applicable app-store billing flow, implement authenticated checkout and idempotent signed webhooks, and test entitlements/refunds in a sandbox. No paywall or charging has been implemented. Sponsored placement remains visibly labelled and does not outrank emergency information.

When GitHub is ready, create **your-pet-care** under an independent account, add its remote and push the local `main` branch. Do not use a BSG account or service for this project.

The conversation is a deterministic guided flow, not an AI chat service. Replies and ideas use the choices provided; no profile is sent to an external model. Guest previews require local browser cookies; cross-device recovery is not implemented.

Menu artwork is native SVG with CSS animation, kept locally with no animation library, external assets or sound. `scripts/browser_menu.py` checks responsive layouts, actual frisbee movement, keyboard/touch navigation, persistent pause, reduced motion and automated accessibility.

## Phone preview and menu search

On the same Wi-Fi/router as this PC, open **http://192.168.0.109:8000**. The current local configuration listens on port 8000 and enables isolated previews for `192.168.0.0/24`; existing owners remain private. Windows denied automatic firewall configuration because the process is not elevated. If the phone cannot connect, open PowerShell as Administrator and run `& "E:\yourpetcare\allow-phone.ps1"`. This adds a rule limited to the Python process, this PC address, port 8000 and that local subnet. No router forwarding or public hosting is configured. If the PC address changes, update allowed hosts, CSRF origins and the firewall rule accordingly. To return to PC-only use, set `YPC_LOCAL_BIND=127.0.0.1`, clear `YPC_PREVIEW_NETWORKS`, remove the named firewall rule and restart.

Category chips narrow the menu. Search checks labels, category names and common terms across every category, including meals, travel, charities and routine treatments. Empty results offer a spelling suggestion where possible and links to other categories. It searches app destinations, not private records or live businesses. Worming, flea/tick and vaccination links prefill a care form without suggesting a treatment or dose.

## Map discovery and every companion

Explore map is the first circular category shortcut on the home page and is also in the main navigation. Open http://192.168.0.109:8000/find-care/ on the same network (or http://127.0.0.1:8000/find-care/ on this PC). Move the map, then choose Search this area; animal, service and keyword filters are retained. Searching a new suburb replaces the previous map centre.

Profiles and the guided conversation support horses/ponies, birds, reptiles, rabbits, guinea pigs, other small mammals, fish, amphibians, invertebrates, farm companions and other animals, alongside dogs and cats. An optional animal type records details such as cockatiel or bearded dragon. Species-specific starter ideas feed the existing calendar and reminder flow. Service introductions can state which animals they serve.

Animal coverage is only recorded when explicitly supported by source information. Unknown listings remain labelled and are included unless the selected-animal-only filter is checked. Existing directory records have incomplete animal coverage; these filters do not establish specialist credentials or acceptance. Local HTTP phone previews cannot use browser GPS; suburb search and map movement work without it.

## Current interface, accounts and pet pictures

Browsing and the guided conversation remain open. Saving pets, plans, service introductions and favourite providers requires a registered account. Signup upgrades the current preview owner, retaining existing records and the conversation; login to a different existing account does not merge workspaces. The final conversation step can be confirmed after signup. Accounts and data remain on this local installation.

Cookie choices offer Accept all, Essential only and custom advertising consent with equal access. The signed preference lasts 180 days and is editable in the footer. No advertising network or tracking script is connected. Reserved advertising spaces appear on the home and map pages and are labelled. Advertising consent is not a saving requirement.

Meet your crew has an illustrated Add pet tile, photo upload and a searchable library of 16 bundled SVG animal illustrations. Search terms include animal types and common names (e.g. bearded dragon). Library images can be used immediately. Choosing one replaces an uploaded photo. New/replacement uploads require admin approval before becoming profile portraits; owners can privately preview pending uploads. Review at `/admin/care/pet/?photo_status__exact=pending`; create your administrator using the command above if not already set up. Approval does not publish private profiles.

Dedicated pages share contextual illustrations and coloured action badges. Healthy Pets uses a heart and stethoscope, vets a bandage and parks a tree. Decorative slogans and repeated introductory copy have been removed from the main views.

Nearby map results now form numbered groups that split as you zoom. Click a group to zoom into it; overlapping locations spread into selectable markers at the closest zoom. Counts cover the current filtered result set. Orange triangles in the underlying OpenStreetMap tiles indicate peaks, not providers.
