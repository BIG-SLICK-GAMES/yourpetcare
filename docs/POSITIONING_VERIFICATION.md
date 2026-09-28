# Product positioning verification - 29 September 2026

## Scope

Incremental public Expo-app positioning, documentation, an isolated companion preview, How it works, map category routing, and clearer text-versus-voice consent. Pip, the curved logo, colours, existing navigation and working feature flows remain in place. The retained Django application was not changed.

## Automated checks

- 25 API tests passed locally and during the scoped EC2 deployment, covering confirmation, ownership, account export/deletion, action idempotence, AI context selection and voice consent.
- 8 mobile unit tests passed, including three new preview tests for stock arithmetic, duplicate actions, completion, dismissal and reset.
- TypeScript, Expo lint and static web export passed. GitHub Pages also built and deployed successfully.
- Seven existing browser journey suites passed against the local static export: short onboarding, planning, supplies, desktop layout, Home navigation, pet removal and animated About/Discovery help.
- Conversation starters: all six sent their respective text prompts with zero microphone permission requests in touch-enabled Chromium at 320 x 568, 390 x 740 and 1440 x 900. The updated local build also passed at 390 x 740. API responses were controlled fixtures, not paid AI calls.

## New-page review

The preview uses an unrelated Luna account fixture while showing fictional Stormy examples. The browser check blocks account mutations and verifies no AI or account writes, duplicate-button disabling, completion, reset/reload, dismissal and vet-filtered map navigation after selecting Parks. It also checks Home links and direct static routes.

All new-page checks passed with no browser console errors or horizontal overflow. Responsive review covers Home, companion preview, How it works, pets, care schedule, account, map, help, privacy, supplies and discovery at 320, 390, 768 and 1440 pixels. The three new/changed presentation screens passed checks with axe WCAG 2 A/AA rules. A small-text contrast issue on the sage preview card was found and corrected using the existing ink colour.

## Important limits

- Browser automation is not physical iOS/Android verification. Native microphone, keyboard and notification behaviour still need device testing.
- The reported conversation-icon microphone activation was not reproduced in the tested browser sizes. The existing shared consent copy referred to recordings even for text prompts; it now explicitly says the microphone stays off for a text conversation. This does not prove a device-specific touch issue is resolved.
- AI remains configured on the public API; its catalogue reported 140 providers and no live weather or crowd service. No new AI integration, keys, purchases, bookings or background monitoring were added.
- Structured medical/weight/stock features in Django remain separate from the public Expo app. The preview is not a migration of those records.
