# Vikkaa.lk Platform: Design

Date: 2026-11-21 · Status: draft for the founders' approval · Domain: vikkaa.lk. The old documents say "vikka.lk"; this design uses vikkaa.lk.

## 1. What this is and why

Vikkaa.lk is a **done-for-you marketing and sales brand for properties and vehicles** in Sri Lanka, run by two founders. Both work in digital marketing and content creation. One of them is also an AI engineer.

It is **not a listings site.** Sellers cannot post ads themselves. Instead:

1. A client hands Vikkaa an asset.
2. Vikkaa analyses the market and recommends a price.
3. Vikkaa shoots premium content with its own equipment.
4. Vikkaa runs the campaign on every relevant platform at once.
5. Vikkaa answers every buyer and closes the sale.

**Why it exists.** Property and vehicle marketing in South Asia is mostly low-quality classified ads. The founders want to:
- bring Western-style marketing to that market;
- become known personally as the trustworthy specialists for it;
- use that to establish themselves in the realtor industry;
- expand abroad later, starting with Sri Lankans living overseas;
- and eventually sell this platform to others.

**The platform's three jobs:**
1. **Give the founders back hours.** Two people must run 6–8 property campaigns plus several car campaigns a month. Anything that isn't creative or face-to-face should be removed or automated.
2. **Prove results to clients.** The client sees everything live without having to ask. This is how trust is built.
3. **Build the assets that compound:** the buyer list, case studies and audience.

## 2. Who uses it

- **Staff:** the two founders now. Crew, editors and a sales person are added later. Everyone gets the same staff access for now (see §7).
- **Clients (sellers).** In priority order:
  1. Repeat sellers: car dealers, land developers selling plots, small builders and condo projects, independent agents.
  2. Private property sellers and owners of premium cars.
  3. Sri Lankans living abroad who are selling property at home.
- **Buyers:** anyone who enquires about a marketed asset, plus members of the **Vikkaa Circle** buyer community.
- **Later, not built now:** other agencies using the platform as paid software.

## 3. Business rules the platform must support

### 3.0 Unit of work: client → engagement → assets *(Claude's call)*

- A **client** can have several **engagements**.
- An engagement is one agreement with its own fees, exclusivity period and fee credit. It covers **one or more assets**.
- Engagement types:
  - **Single:** one asset. The typical private seller.
  - **Batch:** several assets under one agreement, e.g. a developer's land plots.
  - **Project:** one project page with its units listed underneath, e.g. a condo development.
  - **Retainer:** a monthly fee covering N assets a month, e.g. a dealer's cars.
- Each asset has its own status, portfolio page, evidence log, sale and commission.
- Terms such as whether commission applies, the rate and the period are set **per engagement**. So "retainer only, no commission" and "retainer plus commission on cars Vikkaa sells" both work without code changes.
- A refresh campaign after expiry is a new engagement period linked to the same asset.

### 3.1 Seller journey (pipeline stages)

1. **Intake.** The seller fills an online form and the system calculates a fit score.
2. **Discovery call**, 20–30 minutes.
3. **Site visit** by one founder, ending in a go / no-go decision.
4. **Proposal**, made of:
   - a market report (comparable prices and a recommended asking price);
   - a content plan;
   - a quote;
   - the exclusive agreement.
5. **Signed and paid.** The client signs and pays the upfront fee and the ad budget, by bank transfer at first. Payment is marked by hand.
6. **Production.** Shoot, then edit, then the client approves the content in the portal.
7. **Live.** The campaign runs on all channels, with a weekly report in the portal.
8. **Buyers.** Vikkaa answers every enquiry, qualifies the buyer, runs viewings and test drives (group slots preferred), records offers and negotiates.
9. **Sold.** Commission invoice, with the upfront fee credited if the sale is within the agreement period. Payment is collected at the deed signing or vehicle transfer. A case study is published.

Exits:
- **No-go at stage 3:** the client still receives a short, free price read.
- **Expired** (not sold when the agreement period ends): the options are a price review, a paid refresh campaign, or closing the file.

### 3.2 Fit score (stage 1)

**Inputs:**
- reason for selling and timeline;
- asking price against the market;
- document status (deed or vehicle book; any disputes; any lease still owed);
- whether all owners agree;
- whether the seller will sign an exclusive agreement;
- location (Western Province, or outside it with a travel fee).

**Red flags that push towards no-go:**
- "just testing the market";
- co-owners who disagree;
- a price far above market that the seller won't discuss;
- refusing exclusivity.

The founders supply the exact weights. The score is advice; a founder makes the final call.

**Where the "market" figure comes from** *(Claude's call)*:
- The founders keep an **area price table** in the Studio:
  - land price per perch by area;
  - typical house and apartment ranges by area;
  - guide prices for vehicles by model and year.
- They fill it in by hand from public price guides and from their own sales.
- The fit score uses this table, and staff can override the figure for any asset.
- No scraping.

### 3.3 Agreement

The lawyer drafts the wording. The platform stores it, fills in each client's details, and sends it.

**Signing** *(Claude's call: built for the strictest likely requirement; the lawyer confirms what is enough)*:
- An agreement can have **several signatories**: every co-owner, or a power-of-attorney holder with the power of attorney uploaded.
- Each signatory confirms a one-time code sent to their phone, and enters their full name and NIC number.
- The platform stores the final signed PDF, a signing record for each signatory (time, IP address, verified phone number), and a fingerprint (hash) of the document, so any later change to it would show.
- Uploading a scan of a paper-signed copy is also allowed.

Key terms:
- Exclusive for 60–90 days.
- Commission is due if the asset sells during that period, no matter who found the buyer.
- **Follow-on clause:** if a buyer Vikkaa introduced buys within about 6 months after the agreement ends, commission is still due.
- Commission is due at deed signing or vehicle transfer.

### 3.4 Evidence log (protects the commission)

For each asset, the platform records:
- every buyer's first contact, with the time and the channel;
- every viewing and test drive;
- every offer.

This log is the evidence for the follow-on clause. It must be **append-only**: entries can be added, never edited or deleted. All public enquiry points use Vikkaa's own phone and WhatsApp number, never the seller's.

*(Claude's calls; the lawyer confirms the retention and disclosure points):*
- **Two times per entry.** Each entry stores "happened at", which staff can backdate for calls logged by hand, and "recorded at", which the system sets.
- **Corrections** are new entries that point to the entry they correct.
- **Identifying buyers.** A buyer is identified by phone number (international format) and name. At a viewing, the buyer checks in on staff's phone, confirms they were introduced by Vikkaa, and their NIC is captured.
- **Retention.** Entries are kept until the agreement ends, plus the follow-on period, plus a claim period the lawyer sets. They are then anonymised.
- **Deletion requests** received during that window are recorded and carried out when the window closes, if the lawyer confirms the legal-claims basis for keeping them.
- **Privacy notice.** The buyer privacy notice says that the seller may be told which buyers Vikkaa introduced.

### 3.5 Money

- **Upfront fee:** set per quote.
- **Client ad budget:** a separate line, paid upfront by the client, with spend shown in the portal. The founders never pay a client's ads from their own pocket.
- **Commission rate:** one rate per category, set in settings. Starting values: property 3% (about 2% on high-value deals); vehicles a percentage or a minimum amount.
- **Fee credit:** the upfront fee is credited against the commission only if the asset sells within the agreement period.
- **Dealer retainers:** a monthly fee covering a set number of cars a month.
- **VAT:** Vikkaa is not VAT-registered at the start (the threshold is Rs 60M a year). Invoices must be able to add 18% VAT once it registers.
- **Invoice numbering** resets every year, for example VKA-2027-001. *(Claude's call, pending the accountant)*:
  - One sequence covers fees, commissions and retainers.
  - The client's ad budget gets a **deposit receipt** with its own sequence (RCP-…), not an invoice.
  - Numbering resets on the calendar year.
  - The accountant confirms the year basis and how VAT applies to ad deposits.

### 3.6 Buyers and community

- **Buyer profile:** budget, areas, asset type, timeline, financing, source, and consent status.
- **Vikkaa Circle:** buyers opt in, and their consent is recorded. Members see new assets 48 hours before the public. *(Claude's call: a public WhatsApp Channel can't hold anything back or record consent per person.)*
  - Membership is a buyer profile on the site, with consent.
  - Early access goes out through members-only links (by email) and **WhatsApp Business app broadcast lists**. These are free, but only reach people who have saved Vikkaa's number.
  - The public WhatsApp Channel gets each asset after the 48 hours.
  - Paid individual messages through the WhatsApp Cloud API come later, once revenue justifies the per-message cost.
- **Referrals:** the platform records who referred whom. A reward is due when a referred client signs.

## 4. What gets built, by stage

The founders sign founding clients from week 1 and handle any gaps by hand. Each stage replaces the manual work that hurts most.

### Stage 1: launch

**Deadline:** the founders start client work in the first week of December 2026. Stage 1 must be live by **Tuesday 1 December 2026**.

**Must exist before the first founding client** (build in this order):
1. Intake form with fit score.
2. Pipeline board.
3. Proposal, agreement and invoice PDFs.
4. Signing with a one-time code.
5. Evidence log.
6. Enquiry capture.
7. A small, premium public site:
   - home and how it works;
   - one page per asset;
   - the intake and buyer forms;
   - privacy and terms.

**Can follow in the first weeks of December:** content approval in the client portal (WhatsApp until then), the shoot calendar, case-study pages and guides.

**If time runs short,** the order above decides what slips. The public site launches with fewer pages rather than the deadline moving. The visual direction must be agreed with the partner in the first 2–3 days.

Full Stage 1 scope:

**Public site:**
- Brand, founders, how it works, and a "campaigns from Rs X" price guide.
- **Portfolio:** one page per asset with gallery, video, details, an enquiry form, and Vikkaa's WhatsApp and phone.
- Case studies.
- Seller intake form and buyer brief form.
- Guides, salvaged from the old site.
- Privacy, terms and cookies pages.
- Server-rendered pages with per-asset title and Open Graph tags, a sitemap, and schema.org data.
- Mobile-first and fast.

**Studio (staff side):**
- Client and asset records. Assets are a property or a vehicle, each with its own type-specific fields.
- A pipeline board with the stages in §3.1, and the fit score shown on intake.
- Notes and tasks on every record.
- A calendar for visits and shoots, with jobs grouped by area.
- A shot list per asset type: house, apartment, land, car.
- The proposal, agreement and invoice generated as PDFs from the record. Nothing is retyped.
- Payment marked by hand.

**Client portal:**
- Sign-in without a password, via a link sent by email or WhatsApp.
- The client sees their stage, accepts the agreement, approves or comments on content, and sees the published links and an enquiry count.

**Enquiry capture:**
- Every site enquiry lands in the Studio, linked to its asset.
- It creates or updates a buyer record and is written to the evidence log.

### Stage 2: take the grind off

- **Unified enquiry inbox,** including WhatsApp through the official Cloud API.
- **AI assistant on WhatsApp:**
  - answers common questions;
  - qualifies the buyer (budget, timeline, financing);
  - offers viewing slots;
  - hands over to a founder.
- **Group viewing slots,** with booking and reminders.
- **Buyer list** with Vikkaa Circle opt-in and early-access broadcasts.
- **Automatic weekly client report,** in the portal and sent by WhatsApp or email.
- **Market report assistant:** the founders enter comparable prices and AI drafts the report.
- **Closing a deal:**
  - record offers;
  - close the deal;
  - issue the commission invoice with the fee credit applied;
  - generate a case study draft.

### Stage 3: scale the output

- **One-click posting** to Facebook, Instagram, TikTok and YouTube through their official APIs.
- **A copy-ready kit for ikman, LankaPropertyWeb and Riyasewana** (text plus image set), because these sites have no public APIs.
- **Campaign numbers pulled back from each channel:** reach, clicks, enquiries, and cost per enquiry.
- **AI content helpers:**
  - captions and ad copy in Sinhala, Tamil and English;
  - reel templates per asset type;
  - virtual staging.
- **Buyer matching:** new assets are matched to the buyer list.
- **Referral tracking and dealer retainer billing.**

### Later (not designed here)

Selling the platform to other agencies (multi-tenant billing and onboarding), a payment gateway, a mobile app, other countries and currencies, and features for buyers living abroad.

## 5. Goals, non-goals, anti-goals

**Goals:**
- By month 6, the founders run 6–8 property campaigns plus several car campaigns a month without drowning.
- 10+ sales, each with a published case study.
- 1,500+ consented buyers on the list.
- Clients never have to ask "what's happening?"

**Non-goals for now:**
- self-serve listings;
- scraping competitor sites;
- a payment gateway;
- a native mobile app;
- multiple countries;
- selling the software.

**Anti-goals** (failure even if it technically works):
- anything that feels like a classifieds portal, or makes the brand look cheap;
- contacting anyone without consent;
- founders entering the same data twice;
- a build that delays signing clients;
- depending on expensive monthly subscriptions.

## 6. Constraints

- **Zero capital.**
  - Run on the founder's own OVH VPS, 139.99.90.67. The founder is moving its other projects to a new server, so this one is dedicated to vikkaa.lk and app.vikkaa.lk.
  - Use free tiers.
  - No paid SaaS subscriptions where the platform can do the job.
- **Built from scratch.** None of the old site's code or content is reused; the founder no longer has its source. Before it is replaced on the server, its files and database are archived as a safety measure only.
- **Two founders** both operate and build the platform.
- **Market and languages.**
  - Western Province first.
  - Public site in English first, Sinhala next, Tamil later.
  - Marketing captions in all three languages.
- **Data protection law (PDPA):**
  - record consent for buyers and for marketing;
  - include an opt-out on every outbound message;
  - export or delete a person's data on request.
- **Approvals that take weeks.** Start these applications on day 1 so they don't block later stages:
  - Meta (Facebook/Instagram posting and the WhatsApp Cloud API) needs app review and business verification;
  - TikTok and YouTube posting APIs need app review.
  - Until approved, use the WhatsApp Business app, wa.me links, and Meta's own scheduler.
- **Video.** 4K video must not be served from the server's bandwidth.
- **Ready to be sold later:** every record belongs to an organisation, with Vikkaa as the first one. No multi-tenant features are built now.

## 7. Approaches considered

| Approach | Verdict |
|---|---|
| **A. Own app, built in stages alongside real clients** | **Chosen.** Real clients shape each stage. Costs only hosting. Becomes the platform the founders can take abroad and later sell. |
| B. Ready-made tools (e.g. GoHighLevel, Meta Business Suite) | Rejected: monthly subscriptions, a generic look, the buyer list stored elsewhere, and it can never become Vikkaa's own sellable product. |
| C. Extend the old Laravel code | Rejected: the source is no longer available, and it was built for self-serve listings and ad packages, a model now dropped. Nothing is reused. |
| D. Build everything, then launch | Rejected: it delays proof, and repeats the previous attempt's failure (a big build, no clients, code lost). |

## 8. Decisions

**Made by the founders:**
- Approach A.
- The two founders are the crew for the first 6 months, using their own equipment: 2 Sony Alpha cameras, 2 DJI drones, lighting, and flagship phones.
- Western Province first.
- Property is the core business. Vehicles are offered through dealer retainers and premium cars.
- An upfront fee, with commission compulsory on sale.
- **Who builds:** the founder (an AI engineer) builds the app with Claude.
  - The partner is not involved in building. His input is limited to the design: the look and feel of the public site and portal.
  - Any other changes he wants are collected and decided after the product is complete.
- **Platforms:**
  - Campaigns run from **Vikkaa's own Facebook page, Instagram, TikTok, YouTube and Meta ad account**, paid from the client's ad deposit.
  - The partner runs these platforms day to day.
  - All of them must be connected to the app, with posting and stats in Stage 3.
  - **Day-1 action:** the partner grants the founder admin access in Meta Business, TikTok and YouTube, so the developer apps and API reviews (which take weeks) can start immediately.

- **Stack (chosen by the founder from four options):**
  - **Next.js (TypeScript) + PostgreSQL + Drizzle + Better Auth + shadcn/ui.**
  - It matches the founder's existing stack (YoHoBed 2.0, Expo, React projects), and keeps one language across the web app, the future mobile app and the AI features.
  - Rejected: Payload CMS (looks like a CMS, awkward to sell as the product), a NestJS monorepo (too heavy for the deadline), and Laravel/Filament (a language the founder doesn't otherwise use).
- **Hosting:** the founder's OVH VPS, 139.99.90.67, running Docker Compose behind nginx.

**Claude's calls** (founders may override):
- One Next.js app with three faces (public site, client portal, Studio), routed by domain.
- Every record scoped to an organisation, for the future sale of the platform.
- Bank transfer before any payment gateway.
- Passwordless sign-in for clients.
- English-first public site.
- Videos embedded from YouTube (unlisted or public) rather than self-hosted. This is free, and it doubles as distribution.
- **Staff roles:** one "staff" role with full access for now. Separate crew, editor and sales roles come when those people are hired.

## 9. Left to the builder

- **Library-level details** within the chosen stack, such as which background-job tool to use in Stage 2.
- **AI provider and models.** The founder is an AI engineer, so confirm their preference.
- **Media storage** for photos and the client-approval files. Raw footage stays off the platform, on the founders' drives or cloud storage.
- **Visual design.** Agree it with the founders through mockups before building the public site. It must feel premium and trustworthy, never like a classifieds portal.
- **Numbers the founders supply:** fit-score weights, price-guide amounts, commission defaults.
