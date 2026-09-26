# Verification record

Local verification on 26 September 2026, Windows / Python 3.12 / Chromium.

| Check | Result |
| --- | --- |
| Django workflow/security suite | 52 tests passed |
| System checks | No issues |
| Production settings check (`YPC_DEBUG=false`) | No issues from `check --deploy`; operational release gates still apply |
| Migration drift | No changes detected |
| Dependency audit of locked runtime packages | No known vulnerabilities reported by pip-audit |
| Responsive browser checks | 27 page/viewport combinations passed at 1440, 768 and 390 px; no horizontal overflow or JavaScript page errors |
| Mobile automated accessibility | Eight screens checked with axe-core 4.10.3, WCAG 2 A/AA and 2.1 AA tags; zero reported violations after contrast corrections |
| Life planner browser journey | Guided profile, matched ideas, multi-pet hotel plan, preparation completion, rescheduling with custom title and completed history preserved, custom steps, agenda, cancellation and account cleanup passed |
| New planner accessibility | Five new screens: zero axe WCAG 2 A/AA and 2.1 AA violations; life page checked at 390, 768 and 1440 px |
| Real browser journeys | Signup, multiple pets, supplies, marking ordered/received, linked treatment/stock consumption, appointment follow-up, recorded weight, ZIP export and account deletion passed |
| Live provider discovery | Attributed OpenStreetMap data fetched for Brisbane and North Lakes; 132 source-backed provider records in the local database at test time |
| Backup | Archive generated; automated restoration fixture passed SQLite `integrity_check` and row recovery |

The suite verifies owner isolation, private attachments, CSRF rejection, stock validation, completion idempotency, recurrence across Australian daylight saving, schedule follow-ups, email deduplication/uncertainty, guest browsing, source link sanitisation, provider outage handling, review evidence requirements, account deletion and auth throttling.

The live data count is an observation, not a completeness or accuracy claim. Provider fixtures used by automated tests exist only in the temporary test database. Disposable browser QA accounts were deleted after verification; the explicitly labelled local demo account remains.

Screenshots and JSON reports are in the ignored `artifacts/` directory. Email transport was mocked in tests; no live SMTP service, notification delivery receipt, payment or booking integration was exercised. Automated accessibility checks do not replace screen-reader and real-device testing. Hosting, public security review and app-store submission remain later milestones; see README and OPERATIONS.

The expanded planner tests additionally cover species-aware suggestions, age validation, multi-pet creation idempotency, owner isolation, cancellation, reminder lead catch-up, snooze rearming, adventure preferences, month-end recurrence, read-only calendar previews, exported plan membership/alarms and sourced unverified outing imports. No live airline or accommodation booking was made. Travel-policy links are references; preparation dates are editable suggestions.

## Open preview and conversational journey

Nine new backend tests cover isolated passwordless local previews, remote/admin exclusions, disabled-mode privacy, conversation answers and skips, species filtering, simple event creation and duplicate submission, private service introductions, own-preview reset and official resource pages. The existing owner and care suite explicitly tests normal authentication mode.

The Chromium journey checks first arrival without login, six conversational steps, three matched ideas, a saved calendar moment, a walking-service submission and preview reset. Home is checked at 390, 768 and 1440 px. Eight new surfaces passed axe WCAG 2 A/AA and 2.1 AA checks with zero reported violations. The full browser journey passed, including the review-only service submission and preview reset; no JavaScript page errors or horizontal overflow were observed. Local screenshots and the accessibility report are saved in `artifacts/`. Browser testing caught and corrected the initial name-field label and HTML date-default formatting.

## Animated icon menu

The front page now exposes 24 destinations as SVG scenes, without an onboarding requirement. Nine focused journey tests and Django system checks pass after the home change. Browser verification covers 1440/768/390 px layouts, visible dog/frisbee movement, keyboard navigation, pause persistence, reduced-motion settings and single-tap touch navigation. A low-contrast header caption found by axe was darkened. Screenshots and the menu accessibility report are stored locally in `artifacts/`.

The final menu browser run passed all listed interaction checks, with zero axe violations, horizontal overflow or JavaScript page errors.
