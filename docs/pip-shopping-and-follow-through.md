# Pip shopping and follow-through

Original mobile branch; retailer branch designs are unchanged.

Shopping opens an existing list, or creates one empty default list idempotently. Pip asks for the first item using the selected pet name. Voice and visible typing share the existing consent flow. Topic prompts and the create-list gate are removed. Compare puts a request into Pip and returns to the conversation; it never starts the microphone or sends without the owner.

The research_shopping function routes a product request into a required live Responses web search, followed by a review-only answer. Saved shops, selected-pet food restrictions, product size and conversation location inform the comparison. The answer should list retailer prices and locations, distinguish member prices and unknown branch stock, and explain a best-of-verified-options recommendation. Sources come only from API research metadata, with lookup time. It is not a retailer inventory/order integration; web results can be incomplete. Unknown distance, delivery cost or availability must not be invented. List additions retain an owner-selected store and require confirmation or an explicit Add tap.

Pip follows the supplied forward-thinking brief: one relevant supported insight, at most one next action, concise replies, known context before questions, and explicit distinction between facts, calculations, estimates and unknowns. Actual saved settings and proposal states override conversation summaries. Selected-pet recently completed events are included alongside the schedule.

Short-term task notes store task, known/missing details and proposed action per owner/pet/section/list. Confirmation state is resolved from the actual proposal, not model text. Notes expire after seven days, are bounded to 40 threads and clear with chat/list/pet removal. They are conversation memory, not verified pet records. Food remaining, daily usage and treatment supply can be saved in the pet settings with review. There is no autonomous inventory ledger, purchase, booking or background price monitoring.

The dedicated Apache /yourpetcare-api/ proxy timeout is 110 seconds, above the agent 90-second deadline and client 100-second deadline. A 40-second proxy timeout previously interrupted valid multi-retailer research. Other route configuration is unchanged.

Validation: backend tests cover idempotent list preparation, forced web research, source absence, review-before-save, task ownership/expiry/confirmation and chat clearing. Mobile tests, TypeScript and Expo lint run in CI. Live comparison uses a temporary account, deleted after testing.

API reference: https://developers.openai.com/api/docs/guides/tools-web-search
