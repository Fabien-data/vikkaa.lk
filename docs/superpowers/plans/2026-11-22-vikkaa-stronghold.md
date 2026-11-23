# Vikkaa Stronghold: the complete application build plan (v2)

> **Progress (23 Nov 2026):** Phases 0, 1a, 1b, 2a and 2b are built and tested (303 tests). Migrations 0012–0017.
> Differences from this plan: outreach emails send immediately from the one-click batch (no queue, per the founder's choice);
> the signing check is `signingBlocker()` in `src/server/agreement-templates.ts` and also blocks signing when terms changed
> after the draft; the follow-on watch lives in `src/server/deals.tsx`; pilots earn commission on introduced buyers only, with
> no fee credit (matching the pilot wording). Phases 3–6 wait for their triggers.

## Context

On 22 Nov 2026 a 12-juror court voted 12–0 that Vikkaa.lk "as stated" fails: no cash before the runway ends (~mid-Feb 2027), overclaiming, trust-heavy terms from an unknown firm, no lawyer agreement, two-person capacity, and building instead of selling. Brand research added four facts:
- About 40–50% of land deeds are forged and brokers are unregulated, so **"verified"** is the strongest promise Vikkaa can own.
- Used-car dealers hold unsold stock after the 2026 import surcharge.
- Colombo condo sales volumes fell 15% in Q1 2026.
- The data-protection law (PDPA) requires provable consent for marketing, and promotional SMS is blocked on Mobitel.

The founders want the app to be their **stronghold**: it runs every repeatable step until Vikkaa is paid (upfront fee or retainer, **then brokerage commission at sale**), with a full client portal, lead gathering, compliant outreach, Vikkaa's own acquisition and retention campaigns, and a proper section for all social handles (placeholders now, connected later). The founders just go out and sell.

**Decisions made with the founder (22 Nov):**
1. **Event-triggered build.** Phases 0–2b ship by 18 Dec, before Gate A on 20 Dec. Each later phase starts only when its triggering event happens. Build mornings, sell afternoons; 23–28 Nov is the only full-day build week. Pitching starts **Mon 30 Nov by hand**, whatever state the build is in.
2. **Outreach is a one-click batch.** Each morning the war room lists the emails due. The founder reviews them and presses "Send all due" (skipping any). WhatsApp messages are pre-filled and sent from the founder's phone with one tap. No fully automatic sending, because the app can't read replies yet.

**Positioning used in copy:** "Verified property sales in the Western Province: filmed, marketed and sold for you." Sources are in `docs/brand/`, `docs/court/2026-11-22-vikkaa-trial/` and `docs/superpowers/specs/2026-11-21-vikkaa-platform-design.md`.

## Blockers found in today's code (fixed first)

- `generateProposal` requires `upfrontFeeCents > 0` and a recommended price on every asset, and `generateAgreementDraft` requires at least one asset (`src/server/documents.tsx:52-62`). `syncEngagementPaid` needs a paid fee invoice. So **founding (zero-fee) and dealer-retainer deals can't be quoted, signed or taken live**.
- **Nothing stops signing on the draft wording.** `LEGAL_REVIEWED=false` in `src/server/pdf/agreement-terms.tsx` only adds a banner. Do not send signing links to real clients until Phase 2a ships.
- No commission invoice and no fee-credit logic exist (they appear only as wording). Nothing reads `endsAt`, nothing sets stage `closed`, and `circleWithdrawnAt` is never written.
- Uploads over 10 MB can be silently cut off: the proxy buffers 10 MB by default, but actions allow 50 MB.
- `nextDocumentNumber` uses the UTC year, so it is wrong between 00:00 and 05:30 on 1 January in Sri Lanka.
- A route at `src/app/api/...` returns 404 on both hosts (`src/lib/host-routing.ts`). App-host routes must live under `src/app/console/...`.
- Stage-1 case studies (Task 17) and developer project pages (Task 19) were never built.

## Phases

| Phase | Ships | Build days | Trigger |
|---|---|---|---|
| 0. Unblock offers, settings, connections | Tue 24 Nov | 1.5 | — |
| 1a. Selling machine | Sat 28 Nov | 2.5 | — (outreach Mon 30 Nov) |
| 1b. Pitch pages, inbound pages, pitch visits | Fri 4 Dec | 1 | — |
| 2a. Sign lawfully, get paid upfront | Fri 11 Dec | 2.5 | — |
| 2b. Protect the commission | Fri 18 Dec | 2 | — (Gate A, 20 Dec) |
| 3. Portal 2.0, trust layer, project pages | +7 days | 3.5 | First seller or developer signs |
| 4. Buyer automation | +7 days | 3.5 | First live asset with enquiries |
| 5. Proof and retention | +5 days | 2.5 | First testimonial or sale |
| 6. API connections and AI | per integration | 1–2 each | Each approval lands |
| 7. Later | — | — | Sinhala/Tamil site, staff roles when hired, multi-tenant sale of the platform |

Migrations are numbered `0012` (Phase 0) through `0019` (Phase 5). **A new enum value must never be referenced in SQL in the same deploy**, because drizzle runs all pending migrations in one transaction (`drizzle-orm/pg-core/dialect.js:60`).

### Phase 0: Unblock offers, settings, connections (court modes 1, 2)

**Data:**
- `packages` (the price book): name, segment, kind `upfront | retainer | pilot`, price, cars a month, exclusive days, follow-on months, commission bp, commission minimum, founding flag, `publicFrom`, active.
- `org_settings`: one row, zod-parsed `data jsonb`.
- `channel_connections` and enum `channel_status` (`not_set | handle_saved | connected | api_approved | rejected`).
- New `engagements` columns: `packageId`, `foundingTerms`, `monthlyFeeCents`, `unitsPerMonth`, `billingDay`, `retainerEndsOn`, `commissionMinCents`.

**Server:**
- New: `src/server/settings.ts` (`getSettings`/`saveSettings`), `src/server/packages.ts` (`applyPackage`: snapshots the terms onto the engagement, refused after any signature, founding cap of 3), `src/server/channels.ts` (`ensureChannels`, `publicChannels`).
- Fix the `generateProposal` and agreement rules:
  - A priced offer is fee > 0, monthly fee > 0, or founding terms.
  - Recommended price is required only for `single` and `batch` engagements.
  - No assets are required for a retainer.
- `ProposalPdf` gets retainer and founding lines. `Bank()` reads from settings, falling back to `config.bank`.
- `createEngagement` takes its commission default from settings (the vehicle rate for retainers).
- The "from Rs X" guide reads from `packages`. Remove `PRICE_GUIDE_*` from `src/lib/config.ts`.
- `next.config.ts`: `experimental.proxyClientMaxBodySize: '50mb'`.
- New hero copy in `src/app/site/page.tsx`.

**Pages:**
- `studio/(staff)/settings/page.tsx`: business and bank, runway inputs (monthly cost, cash on hand, as-of date), messaging limits, commission defaults, founding cap, live-campaign cap.
- `settings/prices/page.tsx`.
- `settings/connections/page.tsx`: 17 channels (Facebook Page, Instagram, TikTok, YouTube, LinkedIn company and both founders, WhatsApp Business, WhatsApp Channel, Google Business Profile, Meta Business, Meta ad account, ikman, LankaPropertyWeb, Riyasewana, email domain, SMS sender ID). Each has a handle, URL, status, owner, `showInFooter` and notes.
- An "Apply package" control on the engagement page, and Settings added to the Studio nav.
- `SiteFooter` in `src/components/site/SiteChrome.tsx` renders `publicChannels()`, and the same list feeds Organization JSON-LD `sameAs`.

**Done when:**
- The founders enter their prices once.
- A dealer-retainer quote PDF and a founding-terms quote PDF both generate.
- The connections page lists all 17 channels as "not set".
- The footer shows a channel as soon as it has a URL.

### Phase 1a: Selling machine (modes 1, 6; PDPA by design)

**Data:**
- Add `'prospect'` to `subject_type`, so notes, tasks and `/studio/prospects/:id` work as they are.
- `prospects`:
  - name, segment, contact name and role, phone (unique when set), email, district, area, links, stock note;
  - source, `utm`;
  - status `new → contacted → replied → meeting → won | lost | nurture`;
  - owner, `cadenceStep`, `nextActionAt`, `lostReason`, `clientId`;
  - `pitchToken`, pitch views and first/last viewed.
- `messages` (the outbox and activity log) and `consents` (an append-only ledger).
- `message_templates` (outreach and marketing copy only; transactional copy stays in code).
- `clients.source`.
- Backfill `consents` from `buyers.circle_consent_at`.

**Server:**
- `src/server/consent.ts`: `recordConsent`, `canSend`, `withdrawAll`. It keeps `buyers.circleConsentAt` / `circleWithdrawnAt` in sync, bypassing `upsertBuyerByPhone` (which fills empty fields only). Rewire `enquiry-intake.ts` and `site/buy/actions.ts` to it.
- `src/server/templates.ts`: render `{placeholders}`, reject unknown ones on save, seed starter dealer and developer cadences (4 steps each) in the positioning voice.
- `src/server/messaging.ts`:
  - `queueOutreachEmail`, plus `sendAllDue(userId)`, the one-click batch.
  - `whatsappDraft` uses `whatsappLink`, `src/lib/whatsapp.ts`, and appends "Reply STOP".
  - `logTouch` records manual touches.
  - Every send checks consent, quiet hours (09:00–19:00 Sri Lanka time), a cap of 30 a day per sender and a global email cap (100 a day, non-transactional stops at 70). It adds the unsubscribe footer and `List-Unsubscribe` header.
- `src/server/email.ts` gains optional `from`, `replyTo` and `headers`.
- `src/server/prospects.ts`:
  - `quickAdd`, `setStatus`;
  - cadence stepping: a logged touch sets `nextActionAt` from `CADENCE[segment]`, and any status past `contacted` stops the cadence;
  - `todayQueue`;
  - `convertToClient` (below).
- `submitSellerIntake` links a prospect with the same phone.
- `src/server/war-room.ts`: weekly counts, the pitch target of 30, gates, runway.

**Pages:**
- `studio/(staff)/prospects/page.tsx`: list, status filters, and quick add that takes under 30 seconds on a phone.
- `prospects/[id]/page.tsx`: timeline, `NotesPanel`/`TasksPanel`, "Log touch", "Email", "Open WhatsApp → Sent ✓", "Do not contact", "Convert".
- `settings/templates/page.tsx`.
- `studio/(staff)/page.tsx` becomes the **war room**: the today queue with "Send all due", this week's pitches, replies, meetings and wins, Gates A, B and C with countdowns, runway months, and my open tasks.
- `src/app/site/unsubscribe/[id]/page.tsx`. The link is `signPath('/unsubscribe/'+messageId, 10y)` and confirming writes an `all` withdrawal.

**Done when:**
- A dealer is added from a phone in under 30 seconds.
- The intro email is sent from the batch under the founder's name.
- The WhatsApp follow-up appears pre-filled on the right day.
- An unsubscribe blocks the next send.
- The pitch is counted.

### Phase 1b: Pitch pages, inbound pages, pitch visits

**Data:**
- `bookings.engagementId` becomes nullable.
- Add `bookings.prospectId`, with a CHECK that one of the two is set.
- Add `booking_type` values `call` and `pitch`.

**Server:**
- `src/server/pitch.ts`: `recordPitchView(token)`.
  - Ignores crawler user agents and `?preview=1`.
  - The first view creates one "call now" task and an email to the owner, run through `after()`.
- `weekView` switches to left joins and shows the client or prospect name.

**Pages:**
- `src/app/site/for/[token]/page.tsx` (noindex, kept out of the sitemap): segment offer, price from `packages`, samples, portal demo, founding terms, and "Request a call" plus WhatsApp. A client-side beacon component records the view, which skips link-preview bots.
- `src/app/site/dealers/page.tsx` and `developers/page.tsx`: a shared form (honeypot, `rateLimit`, UTM from `searchParams` into hidden fields, optional consent) creates the prospect. Both are added to `STATIC_PAGES` in `src/server/public-assets.ts`.
- Pitch-visit booking from the prospect page, shown in the calendar grouped by area.

**Done when:**
- Opening a pitch page triggers the task and email within a minute.
- A `/dealers` form lands as a prospect with its source.
- Pitch visits appear in the calendar.

### Phase 2a: Sign lawfully, get paid upfront (modes 1, 4)

**Data:**
- `agreement_templates`:
  - kind `seller_exclusive | founding | retainer | pilot`, version, `clauses jsonb`;
  - `approvedAt`, `approvedBy` (the lawyer), `approvalReference`;
  - immutable once approved.
- `engagements.agreementKind`.
- New `documents` columns: `assetId`, `dueOn`, `voidedAt`, `voidReason`, and a unique `key` for idempotency.
- `document_type` gains `retainer_invoice`, `commission_invoice` and `claim_pack`.
- `tasks.dedupeKey` (unique).

**Server:**
- `src/server/agreement-templates.ts`:
  - The active template is the highest approved version of its kind.
  - Clause syntax: `{placeholders}`, plus `[if commission]`, `[if fee]` and `[if deposit]` line prefixes.
  - Today's clauses are seeded as an unapproved v1, and the `LEGAL_REVIEWED` constant is deleted.
- **`assertSignable()` in `src/server/agreement-signer.ts`**, called from `signingLink`, the OTP `requestCode` and `signAgreement`. A paper scan needs either an approved template or a recorded confirmation that the lawyer drafted the paper agreement.
- `src/server/billing.ts`:
  - `issueRetainerInvoice(id, 'YYYY-MM')`: key `retainer:{id}:{period}`, `dueOn = billingDay + 7`.
  - `isFullyPaid` replaces the fee-only rule: every amount due must be received, and an engagement with nothing due counts as paid when it is signed.
- `recordPayment` accepts all invoice types and refuses voided ones.
- `InvoicePdf` renders generic line items.
- `nextDocumentNumber` uses the Sri Lanka year.
- **The ticker**:
  - `src/instrumentation.ts` checks `register()` → `NEXT_RUNTIME==='nodejs'` and (production or `JOBS=on`), then starts a 60-second `setInterval` in `src/server/ticker.ts`.
  - It runs **idempotent sweeps over domain state**. There is no jobs table.
  - The outbox claim is `UPDATE … WHERE status='queued' RETURNING`, retried with backoff. A row stuck in `sending` for more than 10 minutes becomes `failed` and shows in the war room.
  - No new container and no deploy change.

**Sweeps:** `dispatchDueMessages`, `billRetainers`, `remindUnpaid` (+3 days and +7 days), and `morningBrief` (07:30, which doubles as the heartbeat).

**Pages:**
- `settings/agreements/*`: clause editor, preview PDF, approval stamp.
- `studio/(staff)/money/page.tsx`: money owed and overdue, active retainers, MRR.
- The war room adds cash collected and owed, MRR, the survival number (`ceil(cost ÷ retainer price)`), last tick, and failed messages.

**Done when:**
- A signing link can't be sent until the lawyer's version is stamped.
- After the stamp, a dealer signs.
- January's retainer invoice and its reminders go out on their own.

### Phase 2b: Protect the commission (mode 4)

**Data:**
- `deals`: asset, buyer (nullable), agreed price and date, completion due date, advance, notary, status `agreed | completed | fell_through`, basis.
- `ad_ledger`: spend or refund, amount, channel, date, reference.

**Commission rule** (`src/server/commission.ts`, pure, terms snapshotted from the engagement):
- Exclusive engagements:
  - Commission is due on any sale inside the period.
  - After the period, it is due only if the buyer was introduced (shown by an evidence entry dated on or before `endsAt`) and the sale falls within the follow-on months.
- Retainers: commission is due only on introduced buyers, and there is no fee credit.
- `gross = max(price × bp, commissionMin)`.
- `credit = min(fee paid − credit already used, gross)` applies only inside the exclusive period, so a batch uses its credit once.
- `net + VAT`.

**Server:**
- `src/server/deals.ts`:
  - `agreeSale`: under offer, evidence entry for the offer, commission invoice keyed `commission:{dealId}`.
  - `completeSale`: marks the asset sold.
  - `fallThrough`: voids the invoice and puts the asset back live.
- `src/server/follow-on.ts`: watch-list query.
- `ClaimPackPdf`: evidence plus hashes plus the `verifyEvidenceChain` result, staff-only.
- `advanceEngagement` allows `signed → closed` with a reason.
- Ad-ledger balance.

**Sweeps:**
- `expiryWatch`: a task and a client email at T−14 days; at `endsAt`, live becomes expired (an asset under offer gets a task instead); a task 14 days before the follow-on window ends; retainers use `retainerEndsOn`.
- `completionReminders`: deed reminder 3 days before.

**Pages:**
- A Deal section on asset pages.
- On the Money page: the follow-on watch with "Possible breach" (opens the deal form, then the claim pack) and the ad-ledger form.

**Done when:**
- A sale inside the period produces a commission invoice with the credit shown.
- The same buyer after expiry produces follow-on commission with no credit.
- The claim pack prints.

### Phase 3: Portal 2.0, trust layer, project pages (trigger: first client signs; modes 3, 5)

**Data:**
- New `assets` columns: `verification jsonb`, `links jsonb`.
- New `engagements` columns: `publicTitle`, `publicSlug`, `publicDescription`.
- `document_type` gains `payment_slip`, `client_upload` and `payment_receipt`. Not `receipt`, because receipts are summed as ad deposits.

**Server:**
- `src/server/verification.ts`: per-category checklists. The required items join `missingForLive`, and going past 3 live campaigns raises a warning.
- `src/server/reports.ts`: weekly numbers computed from append-only data.
- `getPortalDashboard` adds: viewings, anonymised offers, deposit/spent/balance, links, the last 8 weeks, and payment instructions.
- Portal actions: `uploadSlip`, `uploadDocument`, `submitInventory` (dealer cars as draft assets, then `syncProduction`), and `referSeller` (creates a prospect).
- Staff "Verify slip" calls `recordPayment` and issues a `payment_receipt`.
- `getPublicProject`.

**Pages:**
- `src/app/console/portal/page.tsx`, rebuilt with the partner's design feedback.
- `src/app/site/verified/page.tsx`.
- `src/app/site/projects/[slug]/page.tsx`.
- A Verified badge on `AssetPage` listing only the completed checks.

**Sweeps:** `weeklyReports`, Monday 08:00, with a fresh 7-day `signPath` portal link and a WhatsApp draft.

**Done when:** a client opens one link and sees stage, enquiries, viewings, offers, spend against deposit, live links and documents, and uploads their slip.

### Phase 4: Buyer automation (trigger: first live asset with enquiries; mode 5)

**Data:**
- `booking_type` gains `viewing`; add `bookings.capacity`.
- `viewing_rsvps`.
- New `buyers` columns: `qualifiedAt`, `deletionRequestedAt`, `anonymisedAt`.

**Server:**
- `recordEnquiry` additions: an acknowledgement email in under a minute, a WhatsApp draft for staff, and a signed qualification link.
- `src/server/viewings.ts`: self-booked group slots that feed the existing check-in and evidence log.
- `src/server/circle.ts`:
  - At go-live, set `publishedAt = now + 48h`. `publiclyVisible()` already filters on `publishedAt <= now`, so no scheduler is needed.
  - Matched members with consent get an early-access link.
  - Opted-in phones can be exported for WhatsApp broadcast lists.
- `src/server/data-rights.ts`: export, deletion request, anonymisation after retention. Evidence holds no personal data, so the hash chain survives.

**Pages:** `site/view/[token]`, `site/q/[token]`, `studio/(staff)/inbox`.

**Sweeps:** `viewingReminders` (24 hours and 2 hours before, by email and transactional SMS) and `anonymiseDue`.

### Phase 5: Proof and retention (trigger: first testimonial or sale; modes 2, 3)

**Data:** `posts` (`case_study | guide`), `prospects.referredByClientId`.

**Server and pages:**
- `caseStudyStats` computes days to sell, enquiries, viewings, offers, and price against asking. The numbers are calculated from records, never typed in.
- Pages: `site/case-studies/*` and `guides/*`. Remove the `/guides` redirect in `host-routing.ts` and add both to the sitemap.
- Consent-checked retention sweeps:
  - review ask on day 3 (Google review link from connections);
  - referral ask on day 14;
  - quarterly market update;
  - retainer renewal 14 days before `retainerEndsOn`;
  - re-engagement 30 days after expiry.
- `/studio/reports`: attribution by source and UTM.

### Phase 6: API connections and AI (each when approved)

- Credentials stored in `channel_connections.credentialsEnc` (AES-256-GCM via `node:crypto`, env `CHANNEL_KEY`).
- **WhatsApp Cloud API:** utility templates for reminders, reports and payments. Marketing goes only to people who consented. Webhook at `src/app/console/api/webhooks/whatsapp/route.ts`, verified with `X-Hub-Signature-256`, feeding the inbox.
- **Meta:** Lead Ads webhook into prospects and buyers, Page and Instagram publishing, and a daily import of ad insights into `ad_ledger`.
- YouTube and TikTok.
- **AI helpers** (read the `claude-api` skill first): pitch personalisation, EN/SI/TA captions, report narrative, market-report draft, and a WhatsApp assistant with handover to a founder.

## Cross-cutting rules

- **Convert once:** `convertToClient(prospectId, packageId)` runs in one transaction.
  - It finds the client by `(org, phone)`, the same as `submitSellerIntake`, or creates one.
  - It creates an engagement by segment: dealer → retainer, developer → project, private → single.
  - Then it runs `applyPackage` and marks the prospect won.
  - Notes and messages stay on the prospect, linked from the client.
- **Who can be messaged** (`canSend`):

  | Message type | Allowed when |
  |---|---|
  | Transactional | Always |
  | Outreach | The contact has no "all" withdrawal |
  | Circle or marketing | The latest consent event is a grant |

  SMS refuses anything that isn't transactional. There is no cold WhatsApp through the API.
- **Settings:** business data, runway, caps, defaults and sender profiles go in `org_settings`. Secrets and hosts stay in env (`src/lib/config.ts`).
- **Gates:**
  - **A (20 Dec):** an approved template exists, and either one or more clients have paid or three or more prospects are at meeting or proposal.
  - **B (31 Jan):** one or more dealer or developer invoices are paid. If missed, a **Plan B** banner shows.
  - **C (28 Feb):** MRR is at or above the target share of monthly cost, and a deal is agreed.
- **Reuse, don't rebuild:**
  - `pipeline.ts` (`markSigned`, `advanceAsset`, `syncProduction`), `documents.tsx` (`store`, `recordPayment`), `evidence-log.ts` (`appendEvidence`, `verifyEvidenceChain`), `enquiry-intake.ts`, `bookings.ts`, `content-approval.ts`, `storage.ts`, `notes-tasks.ts`;
  - `signed-url.ts`, `whatsapp.ts`, `phone.ts`, `money.ts`, `form.ts`;
  - UI: `ActionForm`, `Field`, `ShareLinkButton`, `NotesPanel`, `TasksPanel`, `PageHero`, `FormSplit`.
- **Patterns:**
  - Every Studio page and action calls `await requireStaff()`; `tests/unit/staff-pages-guard.test.ts` enforces it.
  - Actions follow `(_prev, form) => ActionResult`.
  - Each domain has its own error class.
  - Read `node_modules/next/dist/docs/` before writing route handlers or actions (Next 16.4.6).

## What the founders must supply

| Item | Needed by |
|---|---|
| Prices: retainer and cars, pilot, standard fee, founding terms, vehicle % and minimum; also monthly cost, cash on hand, Plan B | 24 Nov |
| Resend DNS (SPF, DKIM, DMARC), `MAIL_FROM`, a reply mailbox per founder, the business phone with WhatsApp Business | 27 Nov |
| The partner's review of the outreach copy, pitch page and portal design | 28 Nov, then before Phases 1b and 3 |
| The lawyer's four agreement variants: ad-deposit refund, fee if unsold, sale-date basis, "whoever finds the buyer", the tail, retention, B2B email under the PDPA. Also who pays the lawyer | Text by 11 Dec, stamp by 18 Dec |
| The accountant's answers: VAT on deposits, receipt sequence, voided invoices | 11 Dec |
| Business registration and bank account | Before the first invoice |
| Notify.lk sender ID registration | Before Phase 4 |
| Meta Business verification, WhatsApp Cloud API, TikTok and YouTube app reviews | Start now |
| Social handles | Any time; placeholders are ready in Phase 0 |
| An off-server backup target (`BACKUP_REMOTE`) | Now |

## Risks

| Risk | Level | Mitigation |
|---|---|---|
| Building eats selling time | High | Triggers, selling afternoons, and manual fallbacks |
| Lawyer text is late | High | Signing is blocked by the gate. Outreach and quotes work without it. A lawyer-drafted paper agreement is allowed |
| Commission dispute | High | A pure, table-tested calculation, snapshotted terms, the hash-chained evidence log and claim pack, and the lawyer confirms the sale-date basis |
| Breaking messaging rules (PDPA, WhatsApp, carriers) | High | Consent checked at send time, one-to-one business outreach, transactional-only SMS |
| Resend's free tier runs out | Medium | A global cap with a transactional reserve. Buyer club messages go through WhatsApp broadcast lists. If outgrown, use pay-per-use SES rather than a subscription |
| The ticker dies silently | Medium | The morning brief, the last-tick and failed-message counts on the war room, and sweeps that catch up |
| An enum migration fails | Medium | No same-deploy SQL references to new values. The PGlite tests run the same single-transaction migrate |
| VPS memory and disk | Medium | No new containers, and private uploads are capped |

## Verification (every phase)

1. `pnpm db:generate`, which writes the next numbered migration. Review the SQL for references to new enum values.
2. `pnpm test`: Vitest plus PGlite with real migrations.
   - New integration suites for each phase: `settings`, `packages`, `consent`, `messaging` (quiet hours via `vi.setSystemTime`, caps, unsubscribe), `prospects`, `pitch`, `agreement-gate`, `billing`, `ticker`, `commission` (table-driven, every rule above), `deals`, `expiry`, `follow-on`, `claim-pack`, the portal personal-data check, `viewings`, `circle`, `data-rights`.
   - Extend `documents.test.ts` and `public-site.test.ts`.
3. `pnpm lint` and `pnpm build` (type check).
4. In the running app (`pnpm dev` on `vikkaa.localhost` / `app.vikkaa.localhost`), click through the phase's "done when" scenario, with the dev log standing in for email and SMS.
5. After deploy (`deploy/deploy.sh`): the morning brief arrives, the war room shows a last tick within a minute, and the footer and connections render.

**First implementation step:** replace `docs/superpowers/plans/2026-11-22-vikkaa-stronghold.md` with this v2 plan, and save the founder's two decisions (event-triggered build, one-click batch outreach) to memory.
