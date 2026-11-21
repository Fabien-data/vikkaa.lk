# Vikkaa.lk Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Stage 1 of the Vikkaa platform, built from scratch, by **Tuesday 1 December 2026**:
- the public site on `vikkaa.lk`;
- the Studio and client portal on `app.vikkaa.lk`;
- seller intake with a fit score, the pipeline board, proposal/agreement/invoice PDFs, signing with a one-time code, the append-only buyer evidence log, and enquiry capture.

**Architecture:**
- **One Next.js app (App Router) serves both domains.**
  - A small host-routing function in the Next.js middleware file (`src/proxy.ts`, or `src/middleware.ts` on Next 15) rewrites requests: `vikkaa.lk/*` goes to `src/app/site/*`, and `app.vikkaa.lk/*` goes to `src/app/console/*`. Direct requests to those internal prefixes return 404.
- **Business rules live in plain TypeScript modules** under `src/server` and `src/lib`, tested with Vitest against an in-memory PostgreSQL (PGlite). Pages and server actions only call those modules.
- **Every core table has `organization_id`**, defaulting to `org_vikkaa`, the Better Auth organization seeded at setup. This keeps the door open for selling the platform later; no multi-tenant features are built.

**Tech Stack:**
- Next.js (latest stable) + React + TypeScript, pnpm, Node 22.
- PostgreSQL 17 + Drizzle ORM / drizzle-kit, with PGlite in tests.
- Better Auth (email/password for staff; organization and two-factor plugins).
- Tailwind CSS + shadcn/ui, Zod.
- @react-pdf/renderer, sharp (image resizing).
- Resend (email), Notify.lk (SMS).
- Vitest.
- Docker Compose + nginx + certbot on the OVH VPS at 139.99.90.67.

**Spec:** `docs/superpowers/specs/2026-11-21-vikkaa-platform-design.md`

## Global Constraints

**Codebase and tooling**
- Built from scratch. Nothing from the old vikkaa.lk site is reused, neither code nor content.
- The app lives at the repo root, `d:\Vikkaa.lk`; `docs/` stays.
- Package manager pnpm. Path alias `@/` → `src/`.
- Database columns are snake_case via Drizzle `casing: 'snake_case'`; TypeScript property names are camelCase.

**Domains**
- Production: public `vikkaa.lk` (`www.` redirects to it) and app `app.vikkaa.lk`.
- Local and tests: `vikkaa.test` and `app.vikkaa.test`, from env `PUBLIC_HOST` and `APP_HOST`.
- Host matching ignores the port and is case-insensitive.

**Configuration**
- Every env value is read only through `src/lib/config.ts`, which validates with Zod and fails fast.
- Business constants live in `src/lib/rules.ts`:
  - `DISTRICTS` (all 25)
  - `WESTERN_PROVINCE = ['Colombo','Gampaha','Kalutara']`
  - `FIT_WEIGHTS`
  - `DEFAULT_EXCLUSIVE_DAYS = 90`, `DEFAULT_FOLLOW_ON_MONTHS = 6`
  - `COMMISSION_BP = { property: 300, vehicle: 150 }`
  - `DEFAULT_ORG_ID = 'org_vikkaa'`

**Money, VAT and numbering**
- Money is stored as integer cents (LKR) in `bigint({ mode: 'number' })` columns with suffix `Cents`.
- `formatLkr()` displays amounts like `Rs 1,250,000`.
- Forms take rupees and convert with `rupeesToCents()`.
- VAT is `config.vatRateBp`: default `0`, and `1800` once VAT-registered.
- Invoices are numbered `VKA-2026-001`; ad-deposit receipts `RCP-2026-001`. Both reset on the calendar year. One VKA sequence covers fees, commissions and retainers.

**Evidence and privacy**
- Evidence entries are append-only. The database blocks UPDATE and DELETE with a trigger, and entries are hash-chained.
- Personal data lives on `buyers`, never in an evidence entry's `data`.
- Public pages, the sitemap and JSON-LD never contain `assets.address`, the client's contact details, or any buyer's details.
- Public enquiry points show only `config.vikkaaPhone` and `config.vikkaaWhatsapp`.

**Storage**
- Files are kept on the VPS disk under `config.storageDir`.
  - Public photos go in `public/media/...`, served by nginx at `/media/`.
  - Private PDFs and scans go in `private/...` and are only served through authorised route handlers.
  - `// shortcut: VPS disk; move to object storage when disk or traffic demands`
- Videos are YouTube embeds via `youtube-nocookie.com`.

**Scope limits**
- No self-serve listings, no scraping, no payment gateway (bank transfer, marked by hand).
- The only paid services are Notify.lk SMS and Resend's free tier.
- English only in Stage 1. Public pages are server-rendered and mobile-first.
- The partner gives design feedback only (Task 2). Everything else is built by the founder with Claude.

## Review Focus

1. **Phone numbers in any format.** `0771234567`, `077 123 4567`, `94771234567`, `+94 77 123 4567` and foreign numbers (`+44…`, `0044…`) all resolve to one E.164 client or buyer, with no duplicates. Garbage is rejected with a clear message. Tests go in Task 3, Task 5 and Task 11.
2. **Signatory living abroad (non-`+94` phone).** They get the code by email, because Notify.lk only delivers to Sri Lankan numbers. A non-`+94` signatory without an email cannot be saved. Tests go in Task 9.
3. **Code and signing-link abuse.**
   - Wrong code 5 times locks that code.
   - An expired code is rejected.
   - A resend within 60 seconds is refused.
   - An expired or tampered link shows the expired page with status 403.
   - Opening the link again after signing shows "already signed" and never signs twice.
   Tests go in Task 9.
4. **Private data leaking publicly.**
   - Draft or unpublished assets return 404.
   - No public page, sitemap or JSON-LD contains the address, the seller's phone or a buyer's details.
   - The portal never shows buyer details.
   Tests go in Task 13, Task 11 and Task 12.
5. **Spam and double submits on public forms.**
   - A filled honeypot saves nothing but shows the thanks page.
   - Too many requests from one IP are refused.
   - A double-clicked enquiry gives one buyer, and the second entry is `contact`, not a second `first_contact`.
   Tests go in Task 5 and Task 11.

---

## Before you start (founder actions, day 1)

- [ ] **On the VPS 139.99.90.67:** move the other projects off it, and confirm sudo SSH access [Task 14].
- [ ] **At register.lk DNS:** add `A app.vikkaa.lk → 139.99.90.67` (the apex already points there) [Task 14].
- [ ] **Notify.lk:** create an account, top up a small amount, and request sender ID "Vikkaa" [Task 9].
- [ ] **Resend:** create an account, verify the `vikkaa.lk` sending domain (its DNS records go in at register.lk), and set the from-address, e.g. `hello@vikkaa.lk` [Tasks 5, 9, 11].
- [ ] **Details for the site and invoices:** Vikkaa's business phone and WhatsApp number, bank account details, the price-guide "from" amounts, and both founders' photos and short bios [Tasks 8, 13].
- [ ] **Partner:** review the design mockups within 48 hours [Task 2]. Also grant admin access to Meta Business, TikTok and YouTube now; this is for the Stage 3 API reviews, not needed here.
- [ ] **Lawyer:** the agreement wording plus privacy and terms text. Needed **before the first real signing**, not before building.

## File structure

```
src/
  proxy.ts                         host routing + old-URL redirects (Next 16 name; middleware.ts on Next 15)
  app/
    site/                          public host pages: page.tsx, how-it-works/, portfolio/, property/[slug]/,
                                   vehicle/[slug]/, sell/, buy/, privacy/, terms/, cookies/,
                                   sitemap.xml/route.ts, robots.txt/route.ts
    console/                       app host: login/, studio/(staff)/..., portal/..., sign/[id]/, checkin/[assetId]/
    api/auth/[...all]/route.ts     Better Auth handler
    media/[...path]/route.ts       dev-only file server for public media (nginx serves /media in production)
  db/
    index.ts                       drizzle client
    schema/                        auth.ts (Better Auth generated), core.ts, documents.ts, signing.ts, evidence.ts, index.ts
  lib/                             config.ts, rules.ts, enums.ts, host-routing.ts, phone.ts, money.ts, whatsapp.ts,
                                   id-number.ts, signed-url.ts, rate-limit.ts, canonical-json.ts
  server/                          auth.ts, auth-guard.ts, area-prices.ts, fit-scorer.ts, seller-intake.ts, pipeline.ts,
                                   document-numbers.ts, documents.ts, storage.ts, sms.ts, email.ts, otp.ts,
                                   agreement-signer.ts, buyers.ts, evidence-log.ts, enquiry-intake.ts,
                                   public-assets.ts, portal-session.ts, pdf/*.tsx
  components/                      ui/ (shadcn), studio/, site/
drizzle/                           generated SQL migrations (+ custom evidence trigger migration)
scripts/                           create-staff.ts, seed.ts, migrate.ts (all run with tsx)
tests/                             setup/db.ts, unit/*.test.ts, integration/*.test.ts
design/                            mockups/, DIRECTION.md
deploy/                            Dockerfile, docker-compose.prod.yml, nginx/vikkaa.conf, deploy.sh, backup.sh, archive-old-site.sh
docker-compose.yml                 local Postgres for development
```

---

# Part A: must be live by Tuesday 1 December

### Task 1: Foundation: Next.js app, config, host routing, database, staff login, test harness

**Files:**
- Create:
  - The `create-next-app` skeleton at the repo root.
  - `docker-compose.yml` (postgres:17 on 5432) and `drizzle.config.ts`.
  - Library and server modules: `src/lib/{config,rules,host-routing}.ts`, `src/proxy.ts`, `src/db/index.ts`, `src/db/schema/{auth,index}.ts`, `src/server/{auth,auth-guard}.ts`.
  - Routes and pages: `src/app/api/auth/[...all]/route.ts`, `src/app/console/login/page.tsx`, `src/app/console/studio/(staff)/layout.tsx`, `src/app/console/studio/(staff)/page.tsx`, `src/app/site/page.tsx` (placeholder).
  - Scripts: `scripts/seed.ts` (organization `org_vikkaa` "Vikkaa"), `scripts/create-staff.ts`.
  - Tests: `vitest.config.ts`, `tests/setup/db.ts`, `.env.example`.
- Test: `tests/unit/host-routing.test.ts`, `tests/unit/config.test.ts`, `tests/integration/auth-guard.test.ts`

**Interfaces:**
- `config` (from `src/lib/config.ts`) has these fields:
  - `publicHost`, `appHost`, `appUrl` (= `https://${appHost}`, or `http://` when NODE_ENV ≠ production), `publicUrl`
  - `vikkaaPhone`, `vikkaaWhatsapp` (E.164)
  - `vatRateBp` (default 0)
  - `staffNotifyEmails: string[]` (comma-separated env)
  - `bank: { accountName, accountNumber, bank, branch }`
  - `priceGuide: { propertyCents, vehicleCents }`
  - `notifyLk: { userId, apiKey, senderId }`
  - `resendApiKey`, `mailFrom`
  - `appSecret` (at least 32 characters)
  - `storageDir`, `databaseUrl`
- `routeForHost(host: string, pathname: string): RouteDecision`, where `RouteDecision` is one of:
  - `{ type: 'rewrite'; to: string }`
  - `{ type: 'redirect'; to: string; status: 301 | 307 }`
  - `{ type: 'pass' }`
  - `{ type: 'notFound' }`

  The rules:
  - Strip the port and lowercase the host.
  - On the public host: a path in `OLD_URL_REDIRECTS` gives a 301 (the table is in Task 13; Task 1 creates it empty). Paths starting `/site` or `/console` give `notFound`. Otherwise rewrite to `/site${pathname}` (and `/` to `/site`).
  - On the app host: `/` gives a 307 to `/studio`; `/api/auth/*` gives `pass`; otherwise rewrite to `/console${pathname}`.
  - Any other host gives `notFound`.
  - The proxy's matcher excludes `_next/*`, `favicon.ico` and `/media/*`.
- `auth` (Better Auth instance, `src/server/auth.ts`):
  - Drizzle adapter with provider `pg`.
  - `emailAndPassword: { enabled: true, disableSignUp: true }`, because only founders get accounts.
  - Plugins: `organization()`, `twoFactor()`, `nextCookies()`.
  - `trustedOrigins: [config.appUrl]`.
- `requireStaff(): Promise<{ userId: string; organizationId: string }>` (`src/server/auth-guard.ts`) redirects to `/login` when there's no session.
- `db` (`src/db/index.ts`) is a Drizzle node-postgres client with `schema` and `casing: 'snake_case'`.
- `pnpm staff:create <email> <name>` creates a user with a random password printed once, as a member (role `owner`) of `org_vikkaa`.
  - Public sign-up is disabled, so the script creates the user through Better Auth's server context: the `auth.$context` password hasher plus the internal adapter's create-user and link-account calls.
  - Scripts run with `tsx`, and so do `pnpm db:migrate` and `pnpm db:seed`.
- `notifyLk.*`, `resendApiKey` and `mailFrom` are required only when `NODE_ENV=production`.
- Test harness: `tests/setup/db.ts` creates a PGlite Drizzle instance, runs `drizzle/` migrations, seeds `org_vikkaa`, does `vi.mock('@/db', () => ({ db }))`, and truncates every table except `organization` before each test.

- [ ] **Step 1: Create the app** in `d:\Vikkaa.lk\_skeleton` (non-empty folders are refused), then move everything, including dotfiles, to the repo root and delete `_skeleton`.

```bash
pnpm create next-app@latest _skeleton --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
# after moving:
git init
pnpm add drizzle-orm pg better-auth zod @react-pdf/renderer sharp resend
pnpm add -D drizzle-kit @types/pg vitest @electric-sql/pglite vite-tsconfig-paths tsx
pnpm dlx shadcn@latest init
docker compose up -d   # local Postgres
```

Expected: `pnpm dev` serves http://localhost:3000.

- [ ] **Step 2: Hosts file** (run as admin). Add `127.0.0.1 vikkaa.test app.vikkaa.test` to `C:\Windows\System32\drivers\etc\hosts`.

- [ ] **Step 3: Write the failing tests**

```ts
// tests/unit/host-routing.test.ts
it('rewrites public root to /site', () => expect(routeForHost('vikkaa.test:3000','/')).toEqual({ type:'rewrite', to:'/site' }));
it('rewrites public paths', () => expect(routeForHost('VIKKAA.test','/sell')).toEqual({ type:'rewrite', to:'/site/sell' }));
it('blocks internal prefixes on public host', () => expect(routeForHost('vikkaa.test','/console/studio').type).toBe('notFound'));
it('app root redirects to studio', () => expect(routeForHost('app.vikkaa.test','/')).toEqual({ type:'redirect', to:'/studio', status:307 }));
it('passes auth api', () => expect(routeForHost('app.vikkaa.test','/api/auth/sign-in/email').type).toBe('pass'));
it('rewrites app paths', () => expect(routeForHost('app.vikkaa.test','/portal')).toEqual({ type:'rewrite', to:'/console/portal' }));
it('unknown host is notFound', () => expect(routeForHost('evil.test','/').type).toBe('notFound'));

// tests/unit/config.test.ts
it('rejects a short APP_SECRET', ...)        // parseConfig({...valid, APP_SECRET:'short'}) throws
it('splits staff emails', ...)               // 'a@x.lk, b@x.lk' → ['a@x.lk','b@x.lk']

// tests/integration/auth-guard.test.ts
it('redirects to /login without a session', ...)   // mock auth.api.getSession → null; expect redirect('/login')
it('returns user and organization for staff', ...)
```

`config.ts` must export a `parseConfig(env)` used by both the module and the tests.

- [ ] **Step 4: Run and confirm failure**

Run: `pnpm vitest run tests/unit tests/integration`. Expected: FAIL (modules missing).

- [ ] **Step 5: Implement**
  1. Write the modules above.
  2. Generate the Better Auth schema with `pnpm dlx @better-auth/cli generate --output src/db/schema/auth.ts`.
  3. Generate the migration with `pnpm drizzle-kit generate`.
  4. Write the seed and staff scripts, and add the `staff:create`, `db:seed`, `db:migrate` and `test` scripts to `package.json`.
  5. Build the login page (email + password, then the TOTP step when 2FA is enabled).
  6. The staff layout calls `requireStaff()` and shows a two-factor enrolment prompt until it's enabled.

- [ ] **Step 6: Run and confirm pass, plus a manual check**

Run: `pnpm test`. Expected: PASS.

Then:
1. `pnpm db:migrate && pnpm db:seed && pnpm staff:create you@example.com You`
2. Open http://app.vikkaa.test:3000. It redirects to `/studio`, then to the login page; log in.
3. http://vikkaa.test:3000 shows the placeholder home.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: next.js foundation with host routing, postgres, better auth, test harness"
```

---

### Task 2: Design direction and public layout (in parallel with Tasks 3–5; partner feedback loop)

**Files:**
- Create: `design/mockups/direction-a.html`, `design/mockups/direction-b.html`, `design/DIRECTION.md`, `src/app/site/layout.tsx`, `src/components/site/{SiteHeader,SiteFooter}.tsx`
- Modify: `src/app/globals.css` (theme tokens), `src/app/site/page.tsx`

**Interfaces:**
- Produces the site layout:
  - header navigation: How it works, Portfolio, Sell with us (`/sell`), Find a property (`/buy`);
  - footer: Vikkaa phone and WhatsApp from `config`, plus privacy, terms and cookies.
- Fonts load through `next/font`.
- Produces Tailwind theme tokens: `--color-brand`, `--color-accent`, `--color-ink`, `--color-surface`, `--font-display`, `--font-body`.

- [ ] **Step 1: Build two static mockups** (home hero plus an asset page) using the frontend-design skill.
  - **A** evolves the deep green and gold the old site used (colours only; nothing else is reused).
  - **B** is a clearly different premium direction.
  - Both must feel premium and trustworthy, never like a classifieds portal.
- [ ] **Step 2: Send screenshots to the partner.** Record his choice in `design/DIRECTION.md`: palette hex values, fonts, tone of voice, photo style. **Deadline: 48 hours.** If there's no answer, ship A.
- [ ] **Step 3: Put the tokens into `globals.css`** and build the layout and header/footer from the chosen mockup.
- [ ] **Step 4: Verify**

Run: `pnpm build`. Expected: build succeeds, and the home page renders with the new layout at phone and desktop widths.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: design direction and site layout"
```

---

### Task 3: Core data model and helpers

**Files:**
- Create: `src/lib/{enums,phone,money,whatsapp}.ts`, `src/db/schema/core.ts`, and the generated migration.
- Modify: `src/db/schema/index.ts`
- Test: `tests/unit/phone.test.ts`, `tests/unit/money.test.ts`, `tests/unit/enums.test.ts`, `tests/integration/data-model.test.ts`

**Interfaces:**

**Enums** (`src/lib/enums.ts`): `as const` arrays plus a matching Drizzle `pgEnum` for each.
- `CLIENT_TYPES`: `private`, `dealer`, `developer`, `agent`, `overseas`
- `ENGAGEMENT_TYPES`: `single`, `batch`, `project`, `retainer`
- `ENGAGEMENT_STAGES`: `intake`, `call`, `visit`, `proposal`, `signed`, `no_go`, `closed`
- `ASSET_CATEGORIES`: `property`, `vehicle`
- `ASSET_KINDS`: `house`, `apartment`, `land`, `commercial`, `car`, `suv`, `van`, `other`
- `ASSET_STATUSES`: `draft`, `production`, `live`, `under_offer`, `sold`, `expired`, `withdrawn`

**Enum helpers:**
- `nextStage(s)` gives intake→call→visit→proposal, and `null` for every other stage.
- `kindCategory(k)`: car, suv and van are vehicle; everything else is property.
- `isPublicStatus(s)` is true for live, under_offer and sold.
- `stageLabel(s)` and `statusLabel(s)` return plain English for the portal.

**Tables** (`src/db/schema/core.ts`). All ids are text uuid defaults; all tables have `organizationId` (text, not null, default `org_vikkaa`, FK to `organization`) and timestamps.
- `clients`: `type`, `name`, `phone` (E.164), `email` (nullable), `notes` (nullable). Unique on (`organizationId`, `phone`).
- `engagements`:
  - links: `clientId`, `type`, `stage` (default intake), `parentEngagementId` (nullable)
  - intake: `intakeAnswers` (jsonb), `fitScore` (int, nullable), `fitFlags` (jsonb `string[]`, default `[]`)
  - money: `upfrontFeeCents`, `adBudgetCents` (default 0), `commissionApplies` (default true), `commissionRateBp`
  - terms: `exclusiveDays`, `followOnMonths`
  - text: `contentPlan`, `marketNotes`, `noGoReason`, `priceRead` (all nullable)
  - dates: `signedAt`, `endsAt`, `paidAt` (all nullable)
- `assets`:
  - links: `engagementId`, `category`, `kind`, `status` (default draft)
  - text: `title`, `slug` (unique), `description` (nullable)
  - location: `district`, `area`, `address` (nullable, **private**)
  - price: `askingPriceCents`, `recommendedPriceCents` (nullable)
  - `details` (jsonb)
    - property: `bedrooms`, `bathrooms`, `landPerches`, `floorAreaSqft`
    - vehicle: `make`, `model`, `year`, `mileageKm`, `fuel`, `transmission`
  - media: `photos` (jsonb `{ src: string; srcSet: string }[]`, default `[]`), `youtubeUrl` (nullable)
  - dates and sale: `publishedAt`, `soldAt`, `soldPriceCents` (all nullable)
- `areaPrices`: `kind` (`land_perch`, `house`, `apartment`, `vehicle`), `district`, `area`, `make`, `model`, `year` (all nullable), `lowCents`, `highCents`, `source`.
- `comparables`: `engagementId`, `assetId` (nullable), `description`, `priceCents`, `source`, `observedOn` (date).
- Drizzle `relations` for client↔engagements, engagement↔assets/comparables, and asset↔engagement.

**Helpers:**
- `normalisePhone(raw: string | null | undefined): string | null`
- `formatLkr(cents: number): string`
- `rupeesToCents(input: string | number): number` throws `RangeError` on NaN or a negative value.
- `whatsappLink(e164: string, text: string): string` gives `https://wa.me/{digits}?text={encodeURIComponent(text)}`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/phone.test.ts
it.each([
  ['0771234567','+94771234567'], ['077 123 4567','+94771234567'], ['94771234567','+94771234567'],
  ['+94 77-123-4567','+94771234567'], ['0112345678','+94112345678'], ['+447911123456','+447911123456'],
  ['00447911123456','+447911123456'], ['12345',null], ['',null], [null,null], ['abc',null],
])('normalisePhone(%s) → %s', (raw, out) => expect(normalisePhone(raw)).toBe(out));

// tests/unit/money.test.ts
expect(formatLkr(125000000)).toBe('Rs 1,250,000');
expect(formatLkr(125050)).toBe('Rs 1,250.50');
expect(rupeesToCents('75,000')).toBe(7500000);
expect(() => rupeesToCents('-5')).toThrow(RangeError);

// tests/unit/enums.test.ts
expect(kindCategory('suv')).toBe('vehicle'); expect(nextStage('visit')).toBe('proposal'); expect(nextStage('proposal')).toBeNull();
expect(whatsappLink('+94771234567','Hi there')).toBe('https://wa.me/94771234567?text=Hi%20there');

// tests/integration/data-model.test.ts
it('rejects duplicate client phone in one organization')
it('rejects duplicate asset slug')
it('defaults organizationId to org_vikkaa')
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm vitest run tests/unit/phone.test.ts tests/unit/money.test.ts tests/unit/enums.test.ts tests/integration/data-model.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**, then `pnpm drizzle-kit generate`.

`normalisePhone` rules, in order:
1. Strip spaces and `-`, `(`, `)`, `.`.
2. `00…` becomes `+…`.
3. `0` followed by 9 digits becomes `+94` plus those 9 digits.
4. `94` followed by 9 digits becomes `+94…`.
5. `+` followed by 8–15 digits is kept as-is.
6. Anything else returns null.

- [ ] **Step 4: Run and confirm pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: core schema, enums, phone/money/whatsapp helpers"
```

---

### Task 4: Fit score and area price lookup

**Files:**
- Create: `src/server/fit-scorer.ts`, `src/server/area-prices.ts`
- Modify: `src/lib/rules.ts` (`FIT_WEIGHTS`)
- Test: `tests/unit/fit-scorer.test.ts`, `tests/integration/area-prices.test.ts`

**Interfaces:**

**Types:**
- `IntakeAnswers`:
  - `timeline`: `'0-3m' | '3-6m' | '6m+' | 'testing'`
  - `documents`: `'clean' | 'minor' | 'dispute' | 'lease_owed'`
  - `ownersAgree: boolean`, `exclusiveOk: boolean`, `inWesternProvince: boolean`
- `PriceRange = { lowCents: number; highCents: number }`
- `FitResult = { score: number; flags: FitFlag[]; suggestNoGo: boolean }`
- `FitFlag` is one of: `testing_market`, `overpriced`, `document_issue`, `owners_disagree`, `no_exclusivity`, `outside_wp`, `no_market_data`. The first five are the red flags.

**Functions:**
- `scoreFit(answers: IntakeAnswers, askingCents: number | null, range: PriceRange | null): FitResult` is a pure function. `suggestNoGo` is true when any red flag is present.
- `rangeFor(asset: Asset): Promise<PriceRange | null>`
  - **house / apartment:** match `kind` and `area` (case-insensitive). If there's no area row, fall back to `district`.
  - **land:** use `land_perch` by area, then district, and multiply both bounds by `details.landPerches`. Return null if perches are missing.
  - **car / suv / van:** use `vehicle` with exact `make`, `model` and `year` (case-insensitive). Otherwise null.

**Default `FIT_WEIGHTS`** (Claude's call; the founders can retune):

| Factor | Points | Flag |
|---|---|---|
| timeline 0-3m / 3-6m / 6m+ / testing | 20 / 10 / 5 / 0 | `testing_market` (red) |
| price: asking ≤ 1.10×high / ≤ 1.25×high / above | 25 / 10 / 0 | `overpriced` (red) |
| price: no range or no asking price | 12 | `no_market_data` |
| documents clean / minor / dispute or lease_owed | 20 / 10 / 0 | `document_issue` (red) |
| owners agree yes / no | 15 / 0 | `owners_disagree` (red) |
| exclusive yes / no | 15 / 0 | `no_exclusivity` (red) |
| in Western Province yes / no | 5 / 0 | `outside_wp` |

- [ ] **Step 1: Write the failing tests**

```ts
it('ideal seller scores 100 with no flags')               // 0-3m, clean, yes, yes, in WP; asking 10M, high 10M → { score:100, flags:[], suggestNoGo:false }
it('more than 25% over market is red')                    // asking 13M vs high 10M → flags contain 'overpriced', suggestNoGo true
it('missing market data is neutral')                      // range null → score includes 12, 'no_market_data', suggestNoGo false
it('outside WP is not red')
it('land multiplies per-perch by perches')                // Maharagama 1.5M–2M/perch, 10 perches → 15M–20M (in cents)
it('house falls back to district')
it('vehicle needs exact make/model/year')                 // Toyota Aqua 2017 row, asset year 2018 → null
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/unit/fit-scorer.test.ts tests/integration/area-prices.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: fit scorer and area price lookup"
```

---

### Task 5: Seller intake form (`/sell`)

**Files:**
- Create: `src/lib/rate-limit.ts`, `src/server/email.ts`, `src/server/seller-intake.ts`, `src/app/site/sell/{page.tsx,actions.ts}`, `src/app/site/sell/thanks/page.tsx`
- Test: `tests/unit/rate-limit.test.ts`, `tests/integration/seller-intake.test.ts`

**Interfaces:**
- `rateLimit(key: string, limit: number, windowMs: number, now?: number): boolean` returns true when the request is allowed. It's an in-memory Map with the comment `// shortcut: single-process memory limiter; move to Postgres/Redis when running more than one app instance`.
- `sendEmail(input: { to: string | string[]; subject: string; text: string }): Promise<void>` sends via Resend. When `resendApiKey` is empty outside production, it logs the email instead. Tests use `vi.mock('@/server/email')`.
- `sellerIntakeSchema` (Zod). Fields:
  - `name`, `phone` (passed through `normalisePhone`, with the message "Enter a valid phone number"), `email` (optional)
  - `clientType`, `category`, `kind` (must match `kindCategory`), `district` (from `DISTRICTS`), `area`
  - `askingPriceRupees`
  - `timeline`, `documents`, `ownersAgree`, `exclusiveOk`, `reason` (optional)
  - `details` (type-specific, optional)
  - `website` (honeypot)
- `submitSellerIntake(input: SellerIntakeInput): Promise<{ engagementId: string }>`
  - Finds or creates the client by normalised phone.
  - Creates an engagement: type `single`, stage `intake`, `intakeAnswers` (with `inWesternProvince` derived from the district), `exclusiveDays`/`followOnMonths` from rules, and `commissionRateBp` = `COMMISSION_BP[category]`.
  - Creates one draft asset. The title is generated: "3-bed house, Nugegoda", "20 perch land, Kottawa", or "2017 Toyota Aqua". The slug is the title slugified plus a 6-character random suffix.
  - Runs `rangeFor` then `scoreFit`, and stores the result.
  - Emails `config.staffNotifyEmails` with the subject `New seller intake: {asset title} (fit {score})`.
- Server action `submitSell(prev, formData)`:
  1. If the honeypot is filled, redirect to `/sell/thanks` without saving.
  2. `rateLimit('sell:'+ip, 5, 60_000)` false returns `{ error: 'Too many submissions, try again in a minute.' }`.
  3. Validate, call `submitSellerIntake`, and redirect to `/sell/thanks`.

- [ ] **Step 1: Write the failing tests**

```ts
it('creates client, intake engagement, draft asset and fit score; emails staff')
it('same phone in another format reuses the client')       // '0771234567' then '+94 77 123 4567' → 1 client, 2 engagements
it('rejects kind that does not match category')            // vehicle + house → zod error on kind
it('rejects invalid phone with message')                   // '12345' → 'Enter a valid phone number'
it('honeypot saves nothing')                               // call submitSell with website='x' → 0 clients, redirect thanks
it('limits to 5 per minute per IP')                        // rate-limit unit test: 6th call false; after window true
it('outside WP district sets outside_wp')                  // 'Kandy'
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/unit/rate-limit.test.ts tests/integration/seller-intake.test.ts`
- [ ] **Step 3: Implement.** The page uses `useActionState`. Fields change with category, so details for a property are bedrooms/perches, and for a vehicle make/model/year/mileage.
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: seller intake form with fit score"
```

---

### Task 6: Studio screens: clients, engagements, assets, area prices

**Files:**
- Create:
  - `src/components/studio/{DataTable,MoneyInput,FitBadge,StudioNav}.tsx`
  - `src/app/console/studio/(staff)/clients/{page.tsx,[id]/page.tsx,actions.ts}`
  - `src/app/console/studio/(staff)/engagements/{page.tsx,[id]/page.tsx,actions.ts}`
  - `src/app/console/studio/(staff)/assets/{page.tsx,[id]/page.tsx,actions.ts}`
  - `src/app/console/studio/(staff)/area-prices/{page.tsx,actions.ts}`
  - `src/server/storage.ts`
- Test: `tests/integration/studio-actions.test.ts`, `tests/integration/storage.test.ts`

**Interfaces:**
- Every server action starts with `await requireStaff()` and validates with Zod.
- **Storage** (`src/server/storage.ts`):
  - `putPublicImage(key: string, bytes: Buffer): Promise<{ src: string; srcSet: string }>` uses sharp to write `{key}-640.webp` and `{key}-1600.webp` under `{storageDir}/public/media/`. It returns `src = '/media/{key}-1600.webp'` and `srcSet = '/media/{key}-640.webp 640w, /media/{key}-1600.webp 1600w'`.
  - `putPrivate(key: string, bytes: Buffer): Promise<void>`
  - `readPrivate(key: string): Promise<Buffer>`
  - `sha256(bytes: Buffer): string`
  - Keys are rejected if they contain `..` or start with `/`.
- **Actions:**
  - `saveClient(input)`.
  - `saveEngagement(input)`: fees in rupees, commission %, exclusive days, follow-on months, content plan, market notes.
  - `recalculateFit(engagementId)` reruns `scoreFit` with the first asset's price and range.
  - `markNoGo(engagementId, reason, priceRead)` calls `advanceEngagement` from Task 7. Until Task 7 exists it sets the stage directly. It returns `whatsappLink(client.phone, priceRead)`.
  - `saveAsset(input)` (the address field has the helper text "Private. Never shown publicly").
  - `uploadAssetPhotos(assetId, files)` appends to `photos`, and `reorderAssetPhotos(assetId, srcs)` reorders them.
  - `saveAreaPrice(input)` and `deleteAreaPrice(id)`.
- **Pages:**
  - Lists are DataTables with search and a status/stage filter.
  - The engagement page shows read-only intake answers, `FitBadge` (red flags in red), the assets and comparables sections with inline add, and the **Recalculate** and **No-go** buttons.

- [ ] **Step 1: Write the failing tests**

```ts
it('actions refuse without a staff session')              // requireStaff mocked to throw redirect
it('saveEngagement stores rupees as cents')               // upfront '75,000' → upfrontFeeCents 7500000
it('recalculateFit updates score after adding an area price')
it('markNoGo returns a wa.me link with the price read')
it('putPublicImage writes two webp sizes and returns srcSet')  // temp storageDir
it('storage rejects path traversal keys')                 // '../x' throws
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/integration/studio-actions.test.ts tests/integration/storage.test.ts`
- [ ] **Step 3: Implement** the actions and pages with shadcn components.
- [ ] **Step 4: Run and confirm pass**, then check by hand in `pnpm dev`: create a client, engagement and asset, and upload 3 photos.
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: studio screens for clients, engagements, assets, area prices"
```

---

### Task 7: Pipeline rules and board

**Files:**
- Create: `src/server/pipeline.ts`, `src/app/console/studio/(staff)/pipeline/{page.tsx,actions.ts}`
- Modify: the `markNoGo` action from Task 6, which now calls `advanceEngagement`.
- Test: `tests/integration/pipeline.test.ts`

**Interfaces:**
- `class InvalidTransitionError extends Error`
- `advanceEngagement(id: string, to: EngagementStage, data?: { reason?: string; priceRead?: string }): Promise<void>`
  - Allowed: forward moves within intake→call→visit→proposal.
  - Any of those four can go to `no_go`, which requires `reason`.
  - `no_go` can go back to `intake`.
  - Anything else throws, including proposal→signed, which only happens through `markSigned`.
- `markSigned(engagementId: string, at: Date): Promise<void>` sets `signedAt`, sets `endsAt` = at + `exclusiveDays` days, sets stage `signed`, then calls `syncProduction`.
- `markPaid(engagementId: string, at: Date): Promise<void>` sets `paidAt`, then calls `syncProduction`.
- `syncProduction(engagementId: string): Promise<void>` moves every draft asset to `production` once both `signedAt` and `paidAt` are set.
- `missingForLive(asset: Asset): string[]` returns the missing items among `title`, `description`, `askingPriceCents` and `photos` (at least one).
- `advanceAsset(id: string, to: AssetStatus, data?: { soldPriceCents?: number }): Promise<void>`
  - production→live requires `missingForLive` to be empty, and sets `publishedAt` to now if null.
  - live↔under_offer.
  - live or under_offer → sold requires `soldPriceCents` and sets `soldAt`.
  - live or under_offer → expired.
  - Any status except sold → withdrawn.
  - Anything else throws.
- **Board** at `/studio/pipeline`:
  - Columns Intake, Call, Visit, Proposal hold engagement cards (client name, asset titles, `FitBadge`, a red-flag icon).
  - Columns Production, Live, Under offer, Sold hold asset cards.
  - Each card has a link, a **Move →** button (next allowed state) and a **No-go** button on engagement cards.
  - No drag-and-drop: `// shortcut: buttons only; add drag-and-drop when card volume makes clicking slow`.

- [ ] **Step 1: Write the failing tests**

```ts
it('moves forward through early stages')
it('refuses proposal → signed by hand')                  // InvalidTransitionError
it('no_go requires a reason')
it('signed + paid moves draft assets to production; either alone does not')
it('markSigned sets endsAt from exclusiveDays')          // 2026-12-01 + 90 days → 2027-03-01
it('asset cannot go live without a photo')               // error message includes 'photos'
it('going live sets publishedAt')
it('sold requires a price; sold cannot be withdrawn')
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/integration/pipeline.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass**, then check the board by hand.
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: pipeline rules and board"
```

---

### Task 8: Document numbers, PDFs, payments

**Files:**
- Create:
  - Schema: `src/db/schema/documents.ts`
  - Services: `src/server/{document-numbers,documents}.ts`
  - PDFs: `src/server/pdf/{render,proposal,agreement,agreement-terms,invoice,receipt}.tsx`
  - Studio: `src/app/console/studio/(staff)/engagements/[id]/documents-actions.ts`, `src/app/console/studio/(staff)/documents/[id]/route.ts` (staff download)
- Test: `tests/integration/documents.test.ts`

**Interfaces:**

**Tables:**
- `documents`: `organizationId`, `engagementId`, `type` (enum `proposal`, `agreement`, `agreement_signed`, `agreement_scan`, `invoice`, `receipt`), `number` (unique, nullable), `storageKey`, `sha256`, `amountCents`, `vatCents`, `totalCents` (all three nullable), `issuedAt`, `paidAt` (nullable), `meta` (jsonb).
- `payments`: `documentId`, `amountCents`, `method` (`bank_transfer`, `cash`, `cheque`), `reference` (nullable), `receivedAt`, `recordedByUserId` (nullable).
- `numberSequences`: `key` (primary key, e.g. `VKA-2026`), `last` (int).

**Functions:**
- `nextDocumentNumber(prefix: 'VKA' | 'RCP', at?: Date): Promise<string>`. A single `INSERT … ON CONFLICT (key) DO UPDATE SET last = number_sequences.last + 1 RETURNING last` makes it atomic. The result is formatted `${prefix}-${year}-${String(n).padStart(3,'0')}`.
- `renderPdf(element: ReactElement): Promise<Buffer>` uses `@react-pdf/renderer` `renderToBuffer`.
- `generateProposal(engagementId: string): Promise<Document>` throws `Error` listing what's missing. It needs `recommendedPriceCents` on every asset, plus `contentPlan` and `upfrontFeeCents > 0`. The PDF contains:
  - the market report: comparables table, recommended asking price per asset, market notes;
  - the content plan;
  - the quote: upfront fee, ad deposit, commission %, exclusive days, and the fee-credit rule from spec §3.5;
  - `config.bank` details.
- `generateAgreementDraft(engagementId: string): Promise<Document>` includes `agreement-terms.tsx`. That file holds the spec §3.3 terms as placeholders, **to be replaced with the lawyer's wording before the first real signing**.
- `issueInvoice(engagementId: string): Promise<Document>` uses number VKA, `amount` = upfront fee, `vat` = `Math.round(amount * config.vatRateBp / 10000)`, and `total` = amount + vat.
- `recordAdDeposit(engagementId: string, amountCents: number, reference: string, at: Date): Promise<Document>` creates a receipt (number RCP) together with its payment, and `paidAt` = at.
- `recordPayment(documentId: string, amountCents: number, method: PaymentMethod, reference: string | null, at: Date): Promise<void>` sets the invoice's `paidAt` once the sum of its payments ≥ `totalCents`. When the invoice is paid **and** (`adBudgetCents` = 0 **or** the sum of receipts ≥ `adBudgetCents`), it calls `markPaid`.
- Every PDF is stored with `putPrivate('documents/{orgId}/{engagementId}/{type}-{number or timestamp}.pdf')`, together with its `sha256`.

**Studio:** buttons for Generate proposal, Generate agreement draft, Issue invoice, Record ad deposit and Record payment, plus a documents list with staff download.

- [ ] **Step 1: Write the failing tests**

```ts
it('numbers are sequential per prefix and year')          // VKA-2026-001, -002; RCP-2026-001 independent
it('resets in a new calendar year')                       // at 2027-01-01 → VKA-2027-001
it('grows past 999')                                      // seed last 999 → VKA-2026-1000
it('concurrent calls get distinct numbers')               // Promise.all of 5 → 5 unique
it('invoice without VAT')                                 // 10000000 cents, bp 0 → vat 0, total 10000000
it('invoice with 18% VAT')                                // bp 1800 → vat 1800000, total 11800000
it('proposal lists missing fields')                       // error message includes 'recommended price'
it('stored PDF hash matches')                             // sha256(readPrivate(key)) === doc.sha256; bytes start with '%PDF'
it('partial payment does not mark paid')
it('paid invoice + full deposit + signed moves assets to production')
it('no ad budget: invoice alone marks paid')
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/integration/documents.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass**, then open one PDF of each type by hand and check it reads well.
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: document numbering, pdfs, payments"
```

---

### Task 9: Signing with a one-time code (and paper-scan alternative)

**Files:**
- Create:
  - Library and schema: `src/lib/{signed-url,id-number}.ts`, `src/db/schema/signing.ts`
  - Services: `src/server/{sms,otp,agreement-signer}.ts`
  - Signing pages: `src/app/console/sign/[id]/{page.tsx,actions.ts}`, `src/app/console/sign/[id]/agreement/route.ts` (draft download via signed link)
  - Studio: `src/app/console/studio/(staff)/engagements/[id]/signatory-actions.ts`
- Modify: `src/server/documents.ts` (adds `generateSignedAgreement`, `storeAgreementScan`)
- Test: `tests/unit/signed-url.test.ts`, `tests/unit/id-number.test.ts`, `tests/integration/signing.test.ts`

**Interfaces:**

**Signed links** (`src/lib/signed-url.ts`):
- `signPath(path: string, ttlSeconds: number, now?: number): string` gives `${path}?exp=${unixSeconds}&sig=${hex}`, where sig = HMAC-SHA256(`config.appSecret`, `${path}|${exp}`).
- `verifySignedPath(path: string, params: URLSearchParams, now?: number): 'ok' | 'expired' | 'invalid'` compares with `timingSafeEqual`.

**ID numbers:** `isValidIdNumber(s: string): boolean` accepts old NIC `^\d{9}[VvXx]$`, new NIC `^\d{12}$`, or passport `^[A-Za-z0-9]{6,12}$`.

**Table** `signatories`:
- `engagementId`, `role` (`owner`, `co_owner`, `poa_holder`), `name`, `phone` (E.164), `email` (nullable)
- `poaStorageKey` (nullable; required when role is `poa_holder`)
- code fields: `otpHash`, `otpExpiresAt`, `otpSentAt`, `otpAttempts` (default 0)
- signing record: `signedAt`, `signedName`, `signedIdNumber`, `signedPhone`, `signedIp`, `signedUserAgent`

**Services:**
- `sendSms(e164: string, message: string): Promise<void>` POSTs to `https://app.notify.lk/api/v1/send` (form fields `user_id`, `api_key`, `sender_id`, `to` = digits without `+`, `message`). It throws on a non-2xx response or a JSON `status` other than `success`. When `notifyLk.apiKey` is empty outside production, it logs the message instead of sending.
- `class OtpTooSoonError extends Error`
- `sendSigningCode(signatoryId: string): Promise<'sms' | 'email'>`
  - Throws `OtpTooSoonError` if the last code was sent under 60 seconds ago.
  - Otherwise generates a 6-digit code with `crypto.randomInt`, stores its sha256 with `appSecret` as salt, sets expiry to now + 10 minutes, and resets attempts.
  - Sends by SMS when the phone starts with `+94`, otherwise by `sendEmail`.
  - Text: "Your Vikkaa signing code is {code}. It expires in 10 minutes."
- `verifySigningCode(signatoryId: string, code: string): Promise<boolean>` returns false if expired or if attempts ≥ 5. A wrong code increments attempts; a correct code clears the hash.
- `signAgreement(input: { signatoryId; name; idNumber; code; ip; userAgent }): Promise<{ allSigned: boolean }>`
  - Throws `Error` if already signed, if the ID number is invalid, or if the code is wrong.
  - Records the signing fields.
  - When every signatory has signed, it calls `generateSignedAgreement` and then `markSigned(engagementId, new Date())`.
- `generateSignedAgreement(engagementId: string): Promise<Document>` renders the agreement plus a signature page (each signatory's name, ID number, verified phone, time and IP) with its `sha256`.
- `storeAgreementScan(engagementId: string, bytes: Buffer, filename: string): Promise<Document>`. A staff action calls it and then `markSigned`.

**Studio actions:**
- `saveSignatory(input)`: a non-`+94` phone with no email gives the validation error "Signatories abroad need an email for their code."
- `signingLink(signatoryId)` returns `{ url: config.appUrl + signPath('/sign/'+id, 7*86400), whatsapp: whatsappLink(phone, text) }`.

**Signing page** `/sign/[id]` (app host):
- It verifies the signed link. If the result is `invalid` or `expired`, it renders the "Link expired, ask Vikkaa for a new one" page with status 403.
- If already signed, it shows "Already signed".
- Otherwise it shows a link to download the agreement draft, plus name and ID fields, a **Send code** button (server action, also limited by `rateLimit('otp:'+id, 5, 3_600_000)`) and a **Sign** button.

- [ ] **Step 1: Write the failing tests**

```ts
// unit
it('signed path verifies, expires, and rejects tampering')
it.each(['123456789V','200012345678','N1234567'])('accepts id %s'); it.each(['1234','12345678901'])('rejects id %s')
// integration (vi.mock sms + email; fake timers)
it('Sri Lankan number gets SMS with to=94771234567')
it('overseas number gets email, no SMS')
it('overseas signatory without email cannot be saved')
it('resend within 60s throws OtpTooSoonError')
it('five wrong codes lock the code until resend')
it('expired code is rejected')                            // advance 11 minutes
it('invalid id number is rejected')
it('last signature creates signed agreement and marks engagement signed')  // 2 signatories; stage stays proposal after first
it('second sign attempt after signing throws "already signed"')
it('paper scan marks engagement signed')
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/unit/signed-url.test.ts tests/unit/id-number.test.ts tests/integration/signing.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass**, then do a manual run in `pnpm dev`: add yourself as a signatory and sign, with SMS logged to the console when `NOTIFY_LK_API_KEY` is empty in dev.
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: agreement signing with one-time code, paper scan alternative"
```

---

### Task 10: Buyers and the evidence log (manual logging plus viewing check-in)

**Files:**
- Create:
  - Library and schema: `src/lib/canonical-json.ts`, `src/db/schema/evidence.ts` (buyers, evidenceEntries)
  - Migration: `drizzle/XXXX_evidence_append_only.sql` (custom trigger)
  - Services: `src/server/{buyers,evidence-log}.ts`
  - Studio: `src/app/console/studio/(staff)/buyers/{page.tsx,[id]/page.tsx,actions.ts}`, `src/components/studio/EvidenceTable.tsx` (used on the asset and buyer pages)
  - Check-in: `src/app/console/checkin/[assetId]/{page.tsx,actions.ts}`
- Test: `tests/unit/canonical-json.test.ts`, `tests/integration/evidence-log.test.ts`

**Interfaces:**

**Tables:**
- `buyers`:
  - `organizationId`, `name`, `phone` (E.164; unique per organization), `email`, `nic` (both nullable)
  - preferences: `budgetMinCents`, `budgetMaxCents`, `areas`, `kinds` (jsonb), `timeline`, `financing` (all nullable)
  - `source`
  - consent: `privacyAcceptedAt`, `circleConsentAt`, `circleWithdrawnAt` (all nullable)
- `evidenceEntries`:
  - `organizationId`, `assetId`, `buyerId`
  - `type` (`first_contact`, `contact`, `viewing`, `test_drive`, `offer`, `correction`)
  - `channel` (`web_form`, `whatsapp`, `phone`, `in_person`, `email`)
  - times: `happenedAt`, `recordedAt`
  - `recordedByUserId` (nullable), `data` (jsonb, **no personal data**), `correctsEntryId` (nullable)
  - chain: `prevHash` char(64), `hash` char(64)

**Custom migration:** a trigger that raises `evidence entries are append-only` on any UPDATE or DELETE of `evidence_entries`.

**Functions:**
- `canonicalJson(value: unknown): string` is `JSON.stringify` with object keys sorted recursively.
- `upsertBuyerByPhone(e164: string, attrs: Partial<BuyerInput>): Promise<Buyer>` is scoped to the organization. It only fills fields that are currently empty, never overwriting a stored value with a blank. Consent timestamps are only ever set once.
- `appendEvidence(input: { assetId; buyerId; type; channel; happenedAt: Date; data?: Record<string, unknown>; recordedByUserId?: string; correctsEntryId?: string }): Promise<EvidenceEntry>`
  - Rejects `happenedAt` more than 5 minutes in the future.
  - `type = 'correction'` requires `correctsEntryId`.
  - Inside a transaction, it takes `pg_advisory_xact_lock` on a fixed key, reads the organization's latest `hash` (or 64 zeros), and inserts.
- `verifyEvidenceChain(organizationId: string): Promise<boolean>` recomputes every hash in `recordedAt`, then id, order.

The hash (fixed, so it can be recomputed):

```ts
sha256([prevHash, organizationId, assetId, buyerId, type, channel,
        happenedAt.toISOString(), recordedAt.toISOString(),
        canonicalJson(data ?? {}), correctsEntryId ?? ''].join('|'))
```

**Studio:**
- `EvidenceTable` is read-only.
- Buttons: **Log contact**, **Log viewing / test drive**, **Log offer** (amount in rupees, stored as `data.offerCents`). Each takes `happenedAt` (default now, backdating allowed), a channel and notes (in `data.notes`).
- Row button: **Correct** (notes).
- The asset page has an **Open check-in** link.

**Check-in** `/checkin/[assetId]` (staff session required; mobile layout):
- Fields: name, phone, NIC, and a required checkbox "I confirm Vikkaa introduced me to this {property|vehicle}".
- It calls `upsertBuyerByPhone` (with the NIC), then `appendEvidence` with type `viewing` (property) or `test_drive` (vehicle), channel `in_person`, and data `{ checkin: true, confirmedIntroduced: true }`.

- [ ] **Step 1: Write the failing tests**

```ts
it('canonicalJson sorts nested keys')                     // {b:1,a:{d:1,c:2}} → '{"a":{"c":2,"d":1},"b":1}'
it('entries chain and the chain verifies')
it('raw SQL tampering breaks verification')               // disable trigger in test, update channel, re-enable → verify false
it('UPDATE is blocked by the database')                   // db.update(evidenceEntries)… rejects with 'append-only'
it('DELETE is blocked by the database')
it('future happenedAt is rejected; 3 days ago is accepted with recordedAt now')
it('correction requires the original')
it('upsert never overwrites with blank')                  // name 'Nimal' stays when upsert name ''
it('check-in requires confirmation')
it('check-in logs viewing for property and test_drive for vehicle')
it('check-in entry data has no name, phone or nic')
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/unit/canonical-json.test.ts tests/integration/evidence-log.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: buyers and append-only hash-chained evidence log with check-in"
```

---

### Task 11: Enquiry capture and buyer brief (`/buy`)

**Files:**
- Create: `src/server/enquiry-intake.ts`, `src/app/site/enquire-action.ts`, `src/app/site/buy/{page.tsx,actions.ts}`, `src/app/site/buy/thanks/page.tsx`
- Modify: `src/db/schema/evidence.ts` (adds `enquiries`)
- Test: `tests/integration/enquiries.test.ts`

**Interfaces:**
- `enquiries` table: `organizationId`, `assetId` (nullable), `buyerId`, `channel`, `message` (nullable), `createdAt`.
- `recordEnquiry(assetId: string, input: { name; phone; email?; message?; circle?: boolean }, channel?: Channel): Promise<{ enquiryId: string; type: 'first_contact' | 'contact' }>`
  - Calls `upsertBuyerByPhone`, setting `privacyAcceptedAt`, and `circleConsentAt` when `circle` is true.
  - Inserts the enquiry.
  - Calls `appendEvidence` with type `first_contact` if this asset and buyer have no entries yet, otherwise `contact`. `happenedAt` is now and data is `{ enquiryId }`.
  - Emails staff: `New enquiry: {asset title}`.
- Server action `submitEnquiry(slug, prev, formData)`:
  - Honeypot `website` filled: return success without saving.
  - `rateLimit('enq:'+ip, 5, 60_000)`.
  - The privacy checkbox is required, with the label linking to `/privacy`.
  - The asset must be publicly visible, otherwise `notFound()`.
  - Success message: "Thanks — Vikkaa will contact you shortly."
- `/buy` takes name, phone, email, budget min/max (rupees), areas, kinds, timeline, financing, privacy (required) and circle (optional). It calls `upsertBuyerByPhone` with no evidence entry, then redirects to `/buy/thanks`.

- [ ] **Step 1: Write the failing tests**

```ts
it('first enquiry logs first_contact')
it('second enquiry from same phone in another format is contact for the same buyer')   // 1 buyer; types [first_contact, contact]
it('enquiry on a draft asset is not found')
it('privacy checkbox is required')
it('circle consent is recorded once')                     // second submit keeps original circleConsentAt
it('honeypot saves nothing')
it('buyer brief creates a buyer without evidence')
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/integration/enquiries.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: enquiry capture into evidence log, buyer brief"
```

---

### Task 12: Client portal basics

**Files:**
- Create: `src/server/portal-session.ts`, `src/app/console/portal/{layout.tsx,page.tsx}`, `src/app/console/portal/login/[clientId]/route.ts`, `src/app/console/portal/documents/[id]/route.ts`, `src/app/console/portal/logout/route.ts`, `src/app/console/studio/(staff)/clients/[id]/portal-action.ts`
- Test: `tests/integration/portal.test.ts`

**Interfaces:**
- `startPortalSession(clientId: string): Promise<void>` sets the HTTP-only cookie `vk_portal` = `${clientId}.${exp}.${hmac}` (secure in production, sameSite lax, 7 days).
- `getPortalClientId(): Promise<string | null>`
- GET `/portal/login/[clientId]` verifies the signed link. If valid, it calls `startPortalSession` and redirects to `/portal`. Otherwise it returns 403 with "Link expired, ask Vikkaa for a new one".
- The portal layout redirects to that expired page when there's no session.
- The dashboard shows, per engagement:
  - the stage label;
  - each asset with its status label, public link if published, and enquiry count;
  - documents of type `proposal`, `invoice`, `receipt` or `agreement_signed`;
  - each signatory's name and whether they've signed.

  It **never** shows buyer names, phone numbers or evidence entries.
- GET `/portal/documents/[id]` returns 404 unless the document belongs to the session client and is one of the four allowed types.
- The Studio's `portalLink(clientId)` returns `{ url, whatsapp }` with a 7-day signed link.

- [ ] **Step 1: Write the failing tests**

```ts
it('valid signed link starts a session')
it('tampered or expired link returns 403')
it("client cannot download another client's document")   // 404
it('client cannot download the draft agreement')          // type agreement → 404
it('dashboard data has enquiry counts but no buyer details')  // test the loader getPortalDashboard(clientId)
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/integration/portal.test.ts`
- [ ] **Step 3: Implement**, putting the dashboard query in `getPortalDashboard(clientId)` inside `portal-session.ts` or a sibling loader, so it can be tested.
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: client portal with signed-link sign-in"
```

---

### Task 13: Public site pages, SEO, redirects

**Files:**
- Create:
  - Loaders: `src/server/public-assets.ts`
  - Pages: `src/app/site/{page.tsx,how-it-works/page.tsx,portfolio/page.tsx,privacy/page.tsx,terms/page.tsx,cookies/page.tsx}`, `src/app/site/property/[slug]/page.tsx`, `src/app/site/vehicle/[slug]/page.tsx`, `src/components/site/{AssetGallery,EnquiryForm,ContactButtons}.tsx`
  - Feeds: `src/app/site/sitemap.xml/route.ts`, `src/app/site/robots.txt/route.ts`
- Modify: `src/lib/host-routing.ts` (fills `OLD_URL_REDIRECTS`)
- Test: `tests/integration/public-site.test.ts`, `tests/unit/host-routing.test.ts` (adds cases)

**Interfaces:**

**Loaders** (`src/server/public-assets.ts`):
- `getPublicAsset(category: AssetCategory, slug: string): Promise<PublicAsset | null>` returns null unless the status is public, `publishedAt` ≤ now, and the category matches. **`PublicAsset` deliberately has no `address` field and no client data.**
- `listPortfolio(): Promise<PublicAsset[]>` returns the newest first.
- `assetJsonLd(a: PublicAsset): object` uses `RealEstateListing` for property and `Product` with `offers` for vehicles.
- `sitemapXml(): Promise<string>` lists the static pages plus the URL of every public asset.

**Pages:**
- **Home**, in this order:
  1. hero;
  2. **founders section** (photos and short bios supplied by the founders);
  3. how it works, in brief;
  4. latest portfolio items;
  5. calls to action for `/sell` and `/buy`.
- **How it works** shows the seller journey and the price guide: "Campaigns from {formatLkr(config.priceGuide.propertyCents)}", and the same for vehicles.
- **Portfolio** badges sold assets "Sold".
- **Asset pages** have `generateMetadata` (title, description, `og:image` = first photo), gallery `<img srcSet>`, a YouTube embed via `youtube-nocookie.com` when set, details, price, district/area, `EnquiryForm` (Task 11 action), `ContactButtons` (call plus a WhatsApp link to `config.vikkaaWhatsapp`) and a JSON-LD script.
- **Privacy** must state:
  - that a seller may be told which buyers Vikkaa introduced (spec §3.4);
  - what joining Vikkaa Circle means;
  - how to ask for data to be deleted.

  The privacy checkboxes in Tasks 5 and 11 link to it.

**`OLD_URL_REDIRECTS` (301):**

| Old URL | New URL |
|---|---|
| `/real-estate` | `/portfolio` |
| `/pricing` | `/how-it-works` |
| `/agents` | `/sell` |
| `/register` | `/sell` |
| `/login` | `/sell` |
| `/guides` | `/` |
| `/trust` | `/how-it-works` |
| `/about` | `/how-it-works` |
| `/contact` | `/sell` |

Task 17 replaces the `/guides` entry. The redirect from `www.vikkaa.lk` to the apex is done in nginx (Task 14).

- [ ] **Step 1: Write the failing tests**

```ts
it('getPublicAsset hides draft, unpublished and future assets')
it('category mismatch returns null')                      // vehicle slug requested as property
it('PublicAsset has no address and no client phone')      // Object.keys excludes 'address'; JSON.stringify excludes the client phone
it('JSON-LD type matches category and has no address')
it('sitemap lists only public assets')
it.each([['/real-estate','/portfolio'],['/pricing','/how-it-works'],['/login','/sell']])('old url %s redirects 301 to %s')
```

- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/integration/public-site.test.ts tests/unit/host-routing.test.ts`
- [ ] **Step 3: Implement the pages** with the Task 2 layout and the frontend-design skill. The legal pages get placeholder text until the lawyer's versions arrive.
- [ ] **Step 4: Run and confirm the whole suite and build pass**

Run: `pnpm test && pnpm build`. Expected: all PASS and the build succeeds. Then check every page at phone width, and confirm the asset page source contains neither the address nor the seller's phone.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: public site pages, seo, old-url redirects"
```

---

### Task 14: Deploy to the OVH VPS (139.99.90.67) and go live

**Files:**
- Create: `deploy/Dockerfile`, `deploy/docker-compose.prod.yml`, `deploy/nginx/vikkaa.conf`, `deploy/deploy.sh`, `deploy/backup.sh`, `deploy/archive-old-site.sh`, `docs/RUNBOOK.md`
- Modify: `next.config.ts` (`output: 'standalone'`)

**Interfaces:**
- `deploy/Dockerfile` is a multi-stage Node 22 build.
  - Stage `builder` has the full dependencies and source.
  - Stage `runner` has only the Next standalone server, runs as a non-root user, and listens on 3000.
- `deploy/docker-compose.prod.yml` has three services:
  - `web` (target `runner`): binds `127.0.0.1:3000:3000`, uses `env_file: .env.production`, mounts `/srv/vikkaa/storage:/data/storage` (with `STORAGE_DIR=/data/storage`), restart unless-stopped.
  - `db`: postgres:17 with volume `pgdata`, no public port.
  - `tools` (target `builder`, compose profile `tools`, same env file): used for `pnpm db:migrate`, `pnpm db:seed` and `pnpm staff:create`.
- `deploy/deploy.sh` (run on the server in `/srv/vikkaa/app`):
  1. `git pull`
  2. `docker compose -f deploy/docker-compose.prod.yml build`
  3. `docker compose … --profile tools run --rm tools pnpm db:migrate`
  4. `docker compose … up -d web db`
- `deploy/nginx/vikkaa.conf` (host nginx):
  - `vikkaa.lk` and `app.vikkaa.lk` proxy to `127.0.0.1:3000`, passing `Host` and `X-Forwarded-For`/`X-Forwarded-Proto`.
  - `location /media/` uses `alias /srv/vikkaa/storage/public/media/` with long cache headers.
  - `www.vikkaa.lk` gets a 301 to the apex.
  - `client_max_body_size 50M`.
- `deploy/backup.sh` runs nightly from cron. It does `pg_dump` through `docker compose exec -T db`, gzips it, tars `storage/private`, keeps 30 days, and copies the archive to the founder's new VPS with rsync over SSH (target host set in the script's env).

- [ ] **Step 1: Safety archive of the old site** (`deploy/archive-old-site.sh`). Tar its web folder, dump its database if it has one, and copy its nginx config to `/root/old-vikkaa-archive-2026-11.tgz`. **Nothing from it is reused.** Then disable its nginx site.

Expected: the archive exists and `nginx -t` passes.

- [ ] **Step 2: Server prerequisites.** Install or confirm Docker, the compose plugin, nginx and certbot. Create `/srv/vikkaa/{app,storage}`. Confirm the other projects have been moved off.
- [ ] **Step 3: Repo.** Run `gh repo create vikkaa --private --source . --push`. Add a read-only deploy key on the server and clone into `/srv/vikkaa/app`.
- [ ] **Step 4: `.env.production`.**
  - `PUBLIC_HOST=vikkaa.lk`, `APP_HOST=app.vikkaa.lk`
  - DB credentials, and an `APP_SECRET` from `openssl rand -hex 32`
  - Notify.lk, Resend, phone, WhatsApp, bank, staff emails, price guide
  - `VAT_RATE_BP=0`

  Then run `deploy/deploy.sh`, then `docker compose … --profile tools run --rm tools pnpm db:seed`. Create both founders with `… run --rm tools pnpm staff:create <email> <name>` and enrol both in two-factor at first login.
- [ ] **Step 5: nginx and SSL.** Install `vikkaa.conf`, run `certbot --nginx -d vikkaa.lk -d www.vikkaa.lk -d app.vikkaa.lk`, then `nginx -t && systemctl reload nginx`.
- [ ] **Step 6: Verify live**

```bash
curl -sI https://vikkaa.lk | head -1                  # HTTP/2 200
curl -sI https://www.vikkaa.lk | grep -i location     # https://vikkaa.lk/
curl -sI https://app.vikkaa.lk | grep -i location     # /studio
curl -sI https://vikkaa.lk/real-estate | head -1      # 301
curl -sI https://vikkaa.lk/console/studio | head -1   # 404
```

Then the end-to-end smoke test, by hand:
1. Submit `/sell`.
2. It appears on the board.
3. Add a comparable and a recommended price.
4. Generate the proposal, agreement and invoice.
5. Add yourself as signatory and sign with a **real SMS code**.
6. Record the payment and ad deposit.
7. The asset moves to production. Upload photos and go live.
8. Send an enquiry from a phone.
9. The evidence entry appears.
10. The portal link shows the enquiry count.

- [ ] **Step 7: Cron and runbook.** Add `0 2 * * * /srv/vikkaa/app/deploy/backup.sh` and run it once by hand. Write `docs/RUNBOOK.md` (one page): deploy, roll back (`git checkout <previous tag> && deploy.sh`), where backups live, and how to restore one.
- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: docker deploy, nginx config, backups, runbook" && git push
```

**Pre-launch checklist (before the first real client):**
- [ ] The lawyer's agreement wording has replaced `src/server/pdf/agreement-terms.tsx`.
- [ ] The lawyer's privacy and terms text is live.
- [ ] Real price-guide amounts and bank details are on a test invoice.
- [ ] A real SMS code has arrived on both founders' phones, and an email code has arrived at a test inbox.
- [ ] The nightly backup has run once, and its copy is on the other VPS.

---

# Part B: first weeks of December (after go-live)

### Task 15: Content approval in the client portal

**Files:**
- Create: `contentDrafts` in `src/db/schema/core.ts` (`assetId`, `kind` (`photo_set`, `video`, `reel`), `files` (jsonb) or `youtubeUrl`, `status` (`pending`, `approved`, `changes_requested`), `clientComment`, `decidedAt`), `src/server/content-approval.ts`, a Studio section on the asset page, a portal section and actions.
- Test: `tests/integration/content-approval.test.ts`

**Interfaces:**
- `submitDraft(assetId, input): Promise<ContentDraft>`
- `decideDraft(clientId, draftId, decision: 'approved' | 'changes_requested', comment?: string): Promise<void>`. A comment is required for changes. It throws `notFound` for a draft on another client's asset.
- `isReadyToGoLive(assetId): Promise<boolean>` is true when every draft is approved.

- [ ] **Step 1: Failing tests:**
  - `client approves own draft`
  - `changes require a comment`
  - `cannot decide another client's draft`
  - `ready when all drafts approved`
- [ ] **Step 2: Run and confirm failure.** `pnpm vitest run tests/integration/content-approval.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit** `feat: content approval in client portal`

### Task 16: Visit and shoot calendar with shot lists

**Files:**
- Create: `bookings` (`engagementId`, `assetId` nullable, `type` (`visit`, `shoot`), `startsAt`, `durationMinutes`, `area`, `notes`), `src/lib/shot-lists.ts` (a checklist per asset kind), `src/server/bookings.ts`, the Studio page `/studio/calendar` (a week view grouped by day, then by area; no calendar package), and a printable shot-list page.
- Test: `tests/integration/bookings.test.ts`

**Interfaces:**
- `weekView(weekStart: Date): Promise<Array<{ day: string; areas: Array<{ area: string; bookings: Booking[] }> }>>`
- `findOverlaps(booking): Promise<Booking[]>` returns overlaps as a warning; the booking still saves.
- `SHOT_LISTS[kind]` holds the checklist for each asset kind.

- [ ] **Step 1: Failing tests:**
  - `week view groups same-day bookings by area`
  - `shot list matches asset kind`
  - `overlap is reported but saved`
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit** `feat: visit and shoot calendar with shot lists`

### Task 17: Case-study pages and guides

**Files:**
- Create: `posts` (`type` (`case_study`, `guide`), `title`, `slug`, `body` (markdown), `assetId` nullable, `publishedAt`), a Studio editor, site pages `/case-studies`, `/case-studies/[slug]`, `/guides`, `/guides/[slug]`.
- Modify: remove `/guides` from `OLD_URL_REDIRECTS`, and add posts to `sitemapXml`.
- Test: `tests/integration/posts.test.ts`

**Interfaces:**
- `caseStudyStats(assetId): Promise<{ daysToSell: number; enquiries: number; finalVsAskingPct: number }>` is computed from the records, never typed in.
- The guides are written fresh. Nothing is copied from the old site.

- [ ] **Step 1: Failing tests:**
  - `computes days to sell, enquiries and price vs asking`
  - `unpublished post is not found`
  - `/guides no longer redirects`
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit** `feat: case studies and guides`

### Task 18: Notes and tasks on every record

**Files:**
- Create:
  - `notes` (`subjectType` (`client`, `engagement`, `asset`, `buyer`), `subjectId`, `userId`, `body`).
  - `tasks` (`subjectType`, `subjectId`, `title`, `dueAt` nullable, `assignedUserId` nullable, `doneAt` nullable).
  - `src/server/notes-tasks.ts`, the Studio components `NotesPanel` and `TasksPanel` (on the client, engagement, asset and buyer pages), and a "My open tasks" card on the Studio home.
- Test: `tests/integration/notes-tasks.test.ts`

**Interfaces:**
- `addNote(subject, body, userId)`
- `editNote(noteId, body, userId)` is allowed only for the author, and only within 15 minutes.
- `myOpenTasks(userId)` returns overdue tasks first, then by due date.

- [ ] **Step 1: Failing tests:**
  - `note attaches to each subject type`
  - `only author edits within 15 minutes`
  - `overdue tasks first`
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit** `feat: notes and tasks on records`

### Task 19: Project pages for developers (engagement type `project`)

**Files:**
- Modify: `engagements` gains `publicTitle`, `publicSlug` (unique, nullable) and `publicDescription` (nullable), shown in the Studio only for type `project`. Also modify `sitemapXml` and the asset page (adds a "Part of {project}" link).
- Create: `src/app/site/projects/[slug]/page.tsx`, and `getPublicProject(slug)` in `public-assets.ts`.
- Test: `tests/integration/projects.test.ts`

**Interfaces:**
- `getPublicProject(slug): Promise<{ title; description; units: PublicAsset[] } | null>` returns null for a non-project engagement, or when no unit is publicly visible.

- [ ] **Step 1: Failing tests:**
  - `lists only visible units`
  - `non-project engagement returns null`
  - `project in sitemap only with visible units`
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run and confirm pass.**
- [ ] **Step 5: Commit** `feat: project pages for developers`

---

## Later plans (not in this plan)

- **Stage 2 plan:**
  - unified inbox with the WhatsApp Cloud API and the AI qualification assistant;
  - group viewing slots;
  - Vikkaa Circle broadcasts and the 48-hour early access;
  - automatic weekly client report;
  - market-report AI drafting;
  - offers, deal close, and the commission invoice with fee credit;
  - the anonymisation job;
  - a background-job runner (e.g. pg-boss, on the same Postgres).
- **Stage 3 plan:**
  - one-click posting to Facebook, Instagram, TikTok and YouTube, and the copy-ready kit for ikman, LPW and Riyasewana;
  - campaign stats;
  - AI captions in Sinhala, Tamil and English, and reel templates;
  - buyer matching, referrals, retainer billing.
- **When a second app appears** (an Expo mobile app or a separate worker), move to a pnpm/Turbo monorepo like YoHoBed. Not before.
