# Local operation and future release

## Current local installation

- Project: `E:\yourpetcare`
- URL: `http://127.0.0.1:8000`
- Start: `start.ps1` (or `.venv\Scripts\python run_local.py`)
- Data: `db.sqlite3` and `private_media/`; both ignored by Git.
- Local setup secrets: `.env`, using exclusively `YPC_` variables.
- No remote, public deployment or external account integration is configured.
- A sample account may be created explicitly with `scripts/setup_local.py --demo`. It is not an administrator.

The local server binds to loopback. Do not expose debug mode to the network. A future production server must use a unique secret of at least 50 characters, `YPC_DEBUG=false`, exact allowed hosts, trusted HTTPS CSRF origins and HTTPS termination. Production mode enables secure cookies, HSTS and SSL redirects. If using a reverse proxy, configure trusted forwarding only after validating that the proxy strips client-supplied headers; do not blindly trust `X-Forwarded-For` or `X-Forwarded-Proto`.

## Provider source controls

Nominatim is queried only on an explicit submit, not as autocomplete. Geocoding results cache for 30 days and a database throttle limits uncached queries to one every two seconds. Overpass search uses a 12 km query radius, at most 150 returned elements and a 15-second shared throttle; results cache for one day. Results shown from local data are restricted to 15 km and sorted by straight-line distance. The limit means the directory is not exhaustive. Configure an identifying contact in `YPC_OSM_USER_AGENT` before deployment. `YPC_NOMINATIM_URL`, `YPC_OVERPASS_URL` and `YPC_TILE_URL` allow migration to provisioned services.

Attribution must stay visible. There is no tile prefetch or offline download. OSM-imported facts retain their source URL and are not marked verified. Reviewed records are preserved during upstream refresh. A claimed listing needs independent domain/phone/business evidence, checked outside the app. Put that evidence and the check date in the review notes and provider verification evidence. Do not approve claims just because the submitter asserts ownership. No in-app verification email is sent automatically.

For an emergency claim, independently confirm emergency service and contact/location details, record the source and time in verification evidence, and set the emergency check date. The public emergency filter expires the check after seven days. Confirming the service type does not guarantee space or staffing; users are told to call.

## Notification delivery

For the local launcher a background thread runs `send_reminders` every minute. In a hosted deployment run the command through a monitored scheduler every five minutes instead. Do not depend on a web request to send reminders.

- `in_app`: generated, visible in account settings. No email submission has been attempted.
- `sending`: claimed before network I/O; another worker will not submit the same reminder. A process crash can leave this status behind.
- `submitted`: SMTP accepted the send operation. This is not proof of inbox receipt.
- `uncertain`: failure/timeout; retry is intentionally not automatic because the SMTP server may have accepted the message before the connection failed.

Deduplication keys are unique per task, due time and configured lead offset. Legacy care reminders retain their existing keys. A late worker sends only the most relevant elapsed lead, rather than every missed lead. Snoozing suppresses a task for one hour and rearms one reminder without moving its date. Supply notices are unique per ISO week. A changed due date creates a new reminder key. Preferences choose care/adventure categories, opt-in email, local time zone and earliest hour for day/week reminders. Sub-day reminders and elapsed snoozes can run before that hour. Cancelled plans do not send reminders. If opted in after in-app generation, the existing reminder may be submitted on a later worker run if still actionable.

Investigate `sending`/`uncertain` statuses against the SMTP service logs. Only reset to `in_app` through a controlled management shell after confirming it was not accepted. No automatic resend can guarantee exactly-once external delivery without a provider with idempotency support. Production needs worker monitoring, bounce events and alerting.

## Backup and restore

```powershell
.\.venv\Scripts\python manage.py backup --output backups
```

This uses SQLite's online backup API and copies private uploads into a timestamped ZIP. It expires matching archives older than 30 days in that directory. The archive is sensitive and is **not encrypted by the application**: keep local storage encrypted and copy it to independently controlled, encrypted off-site storage before a public launch. Schedule daily backups and regularly test restoration. Pause writes for a coordinated database/upload snapshot; SQLite itself is consistent but simultaneous media changes can otherwise race the file copy.

To restore:

1. Stop web and reminder processes. Preserve the current data directory separately.
2. Validate that the ZIP is a trusted backup. Extract it into an empty, private directory without overwriting the current database.
3. Run `PRAGMA integrity_check` against the extracted database and verify upload files are present. Use a disposable installation to test owner login, document retrieval, counts and calendar state.
4. Reapply account-deletion requests made since that snapshot. Never resurrect a deleted user's records into production.
5. Point `YPC_DATA_DIR` to the restored directory, run migrations, then resume web/worker processes. Keep the correct independent secret for existing sessions or intentionally rotate it to invalidate them.

Account deletion removes current private data and uploads. A deployment operator must retain a minimal deletion ledger separately until all older backup copies expire. This local build does not automate cross-backup deletion reapplication or off-site copying.

## Public release gates

Use the supported locked packages, rerun tests and `manage.py check --deploy` with production settings, and audit dependencies. Restrict the database and upload directory to the application service user. Configure HTTPS and a trusted reverse proxy, independent email credentials, verified sender DNS, production OSM endpoints if needed, request/response limits, CSRF origins and upload scanning. Do not serve `private_media` directly from a web server. The private file routes perform owner checks and documents download as attachments.

Provide operator contact details in the privacy page, name the actual service providers, define log retention and ensure query-string locations are not retained in routine access logs. Provision real administration accounts and remove the sample user. Do not link this service to BSG infrastructure.

Use PostgreSQL, a shared cache and a durable scheduler before multi-instance deployment. SQLite and a local worker are deliberately suited to the current standalone release.

## Life plans and source policies

Preparation offsets are owner-editable planning prompts, not official deadlines. Check current airline, destination and return-to-Australia requirements before booking. Booking status is owner-recorded and no booking integration exists. Venue starter links were checked on 26 September 2026 and must be reconfirmed directly. Dining/stay map imports require an explicit dog=yes/leashed tag; dog parks use the mapped leisure category. These are community claims, not independent access verification.

Plans keep separate task history per pet. Editing a plan shifts pending tasks in the account time zone and preserves completed tasks. Participating pets cannot be changed after creation. Completing all main events finishes the plan; outstanding preparation remains in its history and calendar but no longer sends reminders.

## Passwordless local preview

The current `.env` enables `YPC_LOCAL_PREVIEW=true`. Middleware creates an isolated unprivileged user with an unusable password for each new loopback browser session. It never grants access to an existing owner’s data or to the admin desk. Preview sessions expire after 30 days; expiry does not delete records. Users can explicitly reset their own workspace in preferences, including uploads and service introductions. Clearing browser cookies without resetting leaves data on disk until an operator removes that abandoned workspace. Disable preview for hosting; use outside the configured preview networks and disabling the flag invalidate existing preview sessions.

Community service introductions reuse `ListingRequest` with a private contact email, service type, area, description and source URL. They remain pending until a human reviews them. To publish one, create the appropriate provider with real coordinates and evidence, then link it in the review desk; do not invent location or verification data. Static community resources retain official source links and a check date of 26 September 2026. They are informational and do not imply affiliation.

## Same-network phone access

Current phone URL: `http://192.168.0.109:8000`. The owner requested phone access; `YPC_LOCAL_BIND=0.0.0.0` and `YPC_PREVIEW_NETWORKS=192.168.0.0/24` are set locally, with the specific host/CSRF origin allowed. The firewall rule attempt returned Windows access denied; `allow-phone.ps1` is available for the owner to run as administrator if needed. It allows only `C:\Python312\python.exe`, TCP 8000, local address `192.168.0.109`, remote subnet `192.168.0.0/24`. Do not forward the port through the router. Listening and HTTP response were checked from this PC; actual phone connectivity requires the same network and a firewall allowance.

## Map and animal coverage

Provider.species_supported is an explicit-source list, edited with animal choices in the review form. Empty means unknown. Do not infer coverage from names or automatically promote submitter claims. Imports preserve this field and all independently reviewed providers. Dining and park imports remain dog-tagged source searches, not evidence that other animals are accepted.

Search this area submits the map centre and current filters only on a click. The upstream query covers 12 km (maximum 150 elements); stored results are shown within 15 km. This is not an exhaustive viewport search. Zoom is preserved but does not change search radius. Browser GPS requires a secure context; local LAN HTTP offers suburb/map alternatives.

## Account saves, advertising placeholders and picture moderation

The latest save gate supersedes the earlier unrestricted preview-saving workflow. Local previews may browse, retain conversation drafts and view their legacy private data, but mutation/edit routes require an account with a usable password. Signup updates that preview owner rather than copying its records. Normal login does not merge owners. SavedProvider is owner-scoped, exported with account data and cascades on account/provider deletion.

`ypc_cookie_choices` is signed, HttpOnly, SameSite=Lax and Secure when HTTPS is used. It records version 1 and an advertising boolean for 180 days; invalid values are treated as undecided. Optional advertising is off by default. No ad network is installed. Reserved slots are static, with no ad requests or click tracking. Before integrating a network, implement real consent enforcement and update disclosures.

Uploaded pet photos have pending/approved/rejected status, a review note and review timestamp. The admin pet screen is limited to photo-review fields; the protected image endpoint checks admin object-view permission. Reviews write actor/action audit records. Replacement uploads reset status and notes. Pending/rejected images are visible only in the owner's upload page and authorised review desk; portrait cards use an illustration until approval. Bundled illustration selection requires an owner account and validates a fixed key list; selecting it clears the former upload using normal file cleanup. No public pet photo gallery exists.

Map clustering runs locally over fetched results using screen distance at the current zoom. Each result appears once. Zooming does not issue a provider search; Search this area remains explicit. At maximum zoom, overlapping services can be spread for selection. The stale-photo review token prevents approving an image that was replaced after the admin opened it.


## Companion operations

The optional API secret is `YPC_OPENAI_API_KEY`; `YPC_COMPANION_MODEL` selects the model. Restart after changing either. No key means guided local mode. Requests are opt-in per message, use a 30-second timeout and a session limit of eight AI calls per minute. This local session limit is not production-wide abuse protection: add authenticated account quotas and API spend limits before hosting. No model can execute writes directly; the server validates proposals and requires a CSRF-protected owner confirmation. No live weather/crowd tools are configured.

Migration 0010 adds owner-scoped CompanionProposal records. Pending choices expire after 30 minutes; account export includes them, and deletion cascades. Clear expired Django sessions regularly with `python manage.py clearsessions`. Treat session chat text as private and exclude it from access/error logs. Live API quality and response latency still need evaluation with an operator-supplied key; mocked API tests do not establish live model quality.
