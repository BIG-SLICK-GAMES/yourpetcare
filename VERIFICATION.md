# Verification record

Local verification on 26 September 2026, Windows / Python 3.12 / Chromium.

| Check | Result |
| --- | --- |
| Django workflow/security suite | 27 tests passed |
| System checks | No issues |
| Production settings check (`YPC_DEBUG=false`) | No issues from `check --deploy`; operational release gates still apply |
| Migration drift | No changes detected |
| Dependency audit of locked runtime packages | No known vulnerabilities reported by pip-audit |
| Responsive browser checks | 27 page/viewport combinations passed at 1440, 768 and 390 px; no horizontal overflow or JavaScript page errors |
| Mobile automated accessibility | Eight screens checked with axe-core 4.10.3, WCAG 2 A/AA and 2.1 AA tags; zero reported violations after contrast corrections |
| Real browser journeys | Signup, multiple pets, supplies, marking ordered/received, linked treatment/stock consumption, appointment follow-up, recorded weight, ZIP export and account deletion passed |
| Live provider discovery | Attributed OpenStreetMap data fetched for Brisbane and North Lakes; 132 source-backed provider records in the local database at test time |
| Backup | Archive generated; automated restoration fixture passed SQLite `integrity_check` and row recovery |

The suite verifies owner isolation, private attachments, CSRF rejection, stock validation, completion idempotency, recurrence across Australian daylight saving, schedule follow-ups, email deduplication/uncertainty, guest browsing, source link sanitisation, provider outage handling, review evidence requirements, account deletion and auth throttling.

The live data count is an observation, not a completeness or accuracy claim. Provider fixtures used by automated tests exist only in the temporary test database. Disposable browser QA accounts were deleted after verification; the explicitly labelled local demo account remains.

Screenshots and JSON reports are in the ignored `artifacts/` directory. Email transport was mocked in tests; no live SMTP service, notification delivery receipt, payment or booking integration was exercised. Automated accessibility checks do not replace screen-reader and real-device testing. Hosting, public security review and app-store submission remain later milestones; see README and OPERATIONS.
