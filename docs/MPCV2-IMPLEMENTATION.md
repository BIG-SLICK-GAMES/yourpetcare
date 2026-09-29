# MPCV2 implementation and rollout

## Inspected foundation

Existing Expo 57 / React Native 0.86 app uses Expo Router, shared `state.tsx`, authenticated Node HTTP API and MongoDB account documents. Authentication uses hashed passwords and expiring hashed bearer tokens. `agent.js` is already the sole Responses gateway, using a validated `offer_choice` tool and optional web search. Model/key configuration remains in server settings. `domain.js` stages and confirms proposals atomically through versioned repository writes. Pet care settings, shopping, maps, voice and chat sections already work.

Initial gaps: `agentFacts` sent every provider and broad context; events only support fixed repeatDays; no structured inventory or change audit; completed proposals are pruned too aggressively; chat receipts lose their source section. Home hides overdue care by using notification projections. Calendar is an agenda but lacks editing/cancellation and calendar-month intervals.

## Ordered implementation

1. Foundation: retain gateway; add selective context/intent and deterministic reads, bounded logging/usage, feature flags, proposal provenance and audit. Preserve existing action schemas and old callers.
2. Core Pip: selected-pet/explicit-name resolution, household summary, relevant memory/history, pending recovery and concise instructions. Context is data, never trusted developer instructions.
3. Care: additive recurrence, event edits/cancellation/snooze, completion history and actor, backwards-compatible reminders and timeline.
4. Inventory: validated quantities/purchases, correction and estimates; atomic treatment completion + stock consumption when explicitly linked and confirmed.
5. UX: household today/overdue/coming-up, temporary setup card, inventory and pet care entry points, helpful empty states; preserve navigation and Pip identity.
6. Directory: repeatable data-quality report, safe rendering/metadata, contextual searches into existing map.
7. Hardening: regression scenarios A–F, permission/staleness/idempotence, mobile layout, lint/typecheck/build, privacy and migration documentation.

## Data and rollout

All changes are additive, with defaults for legacy account documents. No data wipe or production demo seeding. Retain legacy repeatDays and migrate lazily on validated writes. New fields include recurrence, inventory links, actors, document references, notification preferences, audit entries and proposal sourceConversation. Full shared-care permissions/document uploads are future work; records will carry owner/pet references now.

Keep development on MPCV2. Agent V2 is enabled only via explicit server flag during local verification; production remains unchanged until rollout. Tests use isolated synthetic accounts and mocked provider responses. No production secrets enter logs or context.

## Verification record

Server: 64 automated tests pass, including real HTTP routes against an isolated repository and simulated provider responses. Mobile: all 13 automated tests pass, covering reminders, recurrence, offers, sessions, voice and map distance. Type checking passes. Browser and build verification is recorded below.


## Implemented boundaries

The existing Responses gateway remains the only model entry point. V2 performs intent detection and pet resolution, builds bounded relevant context, exposes six owner-scoped read tools, and accepts a structured proposal. No read tool can write data. The existing server proposal service validates ownership, fields and current state again when the owner confirms. Known schedule questions can be answered without a model request. The model may perform at most three read-tool rounds before a final structured answer, within one request timeout.

Durable memory lives in the pet profile, care settings, care history, inventory and existing section conversations. Pending proposals survive refresh; the result is posted back to the originating conversation. The model never receives a database connection, credentials, unrestricted account document or document storage keys. Usage totals are retained as metadata; development diagnostics are disabled in production and exclude private values.

Care supports daily, weekly, monthly, yearly and custom intervals, reminder lead times, editing, cancellation, snoozing, completion actor and history. Monthly schedules preserve their calendar anchor when February is shorter. Completion creates the next configured occurrence once. A cancelled routine creates no further occurrences. Existing repeatDays records remain readable. Day/week calculations use elapsed UTC time; DST-sensitive local wall-clock recurrence is not yet provided.

Inventory distinguishes unknown from zero. Daily consumption is explicitly owner-recorded and estimates are labelled. A purchase adds to the balance at purchase time. Corrections reset its quantity timestamp. Medication/treatment quantities are only consumed by linked, confirmed care completions. Daily estimates cannot be combined with event deductions for the same supply. A linked supply cannot be removed until the pending care link is removed. Nothing orders a product or books an appointment.

Home includes household care and one useful stock insight. Each pet has a care overview, supplies and document-reference entry points. Optional setup suggests one missing area at a time and can be dismissed. Existing Pip, navigation, map, shopping, discovery and identity are retained. The calendar groups actual care records; it does not fabricate completed occurrences.

Native reminders respect important/helpful/optional preferences. Done and Remind later notification actions open a review before saving. Notifications are local to a device, require permission and are refreshed while the app is used; this is not a server push-delivery guarantee. Optional store alerts also respect the optional category.

## Data model and retention

- Event additions: recurrence `{unit, interval}`, recurrenceAnchor, reminderMinutes, priority, snoozedUntil, inventoryId, quantityUsed, completedAt/completedBy, cancelledAt.
- Inventory: owner-account scoped id/petId, product/category/unit, quantity, dailyUse, quantityAt, reorderDays and lastPurchaseAt. Estimates are calculated, not permanent stock facts.
- Proposal additions: userId, source, sourceConversation and timezone. Pending entries remain recoverable; terminal proposal history is bounded to 100 entries.
- Audit: last 500 confirmed changes with actor, pet, action, timestamp, source and before/after metadata. Account export includes the retained audit, inventory and document metadata. This is bounded application history, not an immutable compliance ledger.
- Notification preferences default to important/helpful enabled and optional disabled unless explicitly changed.
- Documents: owner-account and pet-scoped references with title/category and private storage reference reserved for a future authorised file service. Upload, extraction and content retrieval are deliberately not claimed or enabled.
- Shared care: completion/audit actors are recorded now. All current authorisation remains owner-only. Future membership/role checks must be added centrally before inviting caregivers; no sharing UI or expanded access is enabled.

No migration script rewrites existing accounts. New arrays/fields default safely on read; validated writes add them. Removing a pet removes its private inventory/document/audit references and conversations. Account deletion continues through the existing repository deletion flow.

## Directory audit

See DIRECTORY-AUDIT.md and its machine-readable JSON. All 140 seed listings were audited. There are 63 missing addresses, 2 partial-address candidates, 99 missing phones, 86 missing websites and 10 potential duplicate pairs. Empty animal coverage is unknown, not universal suitability. No real-world detail or duplicate deletion was invented. Map details disclose unknown hours/verification and retain the existing canonical favourite IDs.

## Rollout and rollback

1. Review and test this branch against a staging MongoDB copy. Back up the account collection using the existing deployment procedure.
2. Deploy the additive backend before the new client. Keep `YPC_PIP_AGENT_V2=0` initially; manual care/inventory actions still require the upgraded server.
3. Enable `YPC_PIP_AGENT_V2=1` on staging with the existing server-managed model/key. Exercise the A-F conversations against a real provider and review safety, latency and cost.
4. Validate notification permission, scheduling and quick actions on physical iOS and Android devices. Web cannot prove device delivery.
5. Roll out the client and flag deliberately. Setting the flag back to 0 restores the legacy chat gateway behaviour while preserving all saved records. Do not downgrade the server to code that cannot understand the new event fields while retaining the new client.

No production deployment or production data mutation was performed for this build. Local fixtures are synthetic and isolated; a simulated provider tests the tool/persistence contract, not the quality of a live model's conversation.

## Source references

- OpenAI function calling: https://developers.openai.com/api/docs/guides/function-calling
- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- Expo notifications: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- React Native accessibility: https://reactnative.dev/docs/accessibility


## Regression conversation review

| Scenario | Automated evidence | Live-model review before rollout |
| --- | --- | --- |
| A: When is worming due? | Known-date read joins an explicitly linked remaining dose without a write or model call. | Check concise wording with real household data. |
| B: Had worming today | Proposal leaves state untouched; confirmation records completion, consumes one known dose and advances the configured routine once. | Verify natural paraphrases choose the matching event. |
| C: Bought a food bag | Confirmed purchase adds to estimated balance in the recorded unit; unknown rate stays unknown. | Verify clarification of bag size and product ambiguity. |
| D: Reuse a known vet | Selected context includes the saved preferred vet; scoped read tools retrieve recorded care details. | Verify Pip does not ask for details already recorded. |
| E: What's coming up? | Household summary includes both pets without forcing navigation. | Check appropriate selection when multiple pets are explicitly mentioned. |
| F: Refresh during confirmation | HTTP and domain tests preserve the pending proposal and do not execute it until confirmed; duplicate confirmation is idempotent. | Browser journey validates the visible confirmation recovery. |

Run build checks sequentially on the 16 GB development machine. Web/native export scripts cap Metro at two workers. Existing runtime servers need not be stopped for routine verification.


## Browser and accessibility verification

The exported web build passed the isolated browser journey: both pets on Home, a conversational care proposal, refresh recovery, explicit confirmation, supply consumption, stock correction and completed history. Twelve routes were checked at widths 320, 390 and 1440 pixels with no document-level horizontal overflow or page JavaScript errors. Screenshots are in `artifacts/mpcv2-qa/`, including the pending choice and post-confirmation receipt. The test uses real app/API/domain code with synthetic records and a simulated provider response.

New controls use the existing labelled input/button components, selected states, alert errors, decorative SVG handling and wrapping text. Reviewed phone screenshots retain the chat input and confirmation controls. This is targeted accessibility verification, not a claim of formal WCAG certification or a substitute for device screen-reader testing.

Web export, TypeScript and lint pass (two existing hook-dependency warnings remain in the chat components). Android and iOS exports also pass (1,569 Android modules and 1,435 iOS modules). These are JavaScript/Hermes bundle checks, not signed store builds or physical-device tests.


## Final validation commands

- `node --test mobile-server/test/*.test.js`: 64 passed, 0 failed.
- `node --test mobile/test/*.test.cjs`: 13 passed, 0 failed.
- From `mobile`: `node node_modules/typescript/bin/tsc --noEmit`: passed.
- From `mobile`: `node node_modules/eslint/bin/eslint.js src`: 0 errors, 2 existing warnings.
- From `mobile`: `expo export --platform web --max-workers 2`: passed, 30 static routes.
- From `mobile`: `expo export --platform android --platform ios --max-workers 2`: passed.
- Isolated browser journey: 12 routes at 320 x 568, 390 x 844 and 1440 x 900; care confirmation/refresh, inventory correction and history passed; no page errors or horizontal overflow.
- `git diff --check`: passed.

Exported QA bundles use an isolated test API address and must not be published. Rebuild with the intended HTTPS backend for any staging or production release. Test logs and screenshots are under `artifacts/mpcv2-qa`; synthetic native bundles are under `artifacts/mpcv2-native`.

## Publishing MPCV2 at the existing address

GitHub Pages uses the Actions workflow in `.github/workflows/mobile-preview.yml`, triggered by `MPCV2`. The `github-pages` environment permits that branch; older branches cannot overwrite the site. The address stays https://big-slick-games.github.io/yourpetcare/ and the build uses https://21-holdem.com/yourpetcare-api.

The matching additive EC2 API is deployed with `YPC_PIP_AGENT_V2=1`. Source and private configuration were backed up server-side before updating only the dedicated Your Pet Care service. The database and unrelated services were not replaced. `build-info.json` in each published web build identifies its source branch and commit. Local QA bundles with the simulated API address are never uploaded.
