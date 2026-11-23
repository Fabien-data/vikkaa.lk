# Vikkaa.lk market research (November 2026)

Desk research to support brand discovery and the application plan. Each finding gives what it means for Vikkaa. Sources are listed at the end. Where sources disagreed or were secondary, that is noted, so check before relying on any number.

## 1. Trust is the market's biggest gap

- **Forged deeds are common.** The Registrar General's Department has estimated that **40–50% of land deeds in Sri Lanka are forged** (an estimate from 2019, repeated in 2022). Courts jailed lawyers and officials over fake deeds in February and March 2026. Forgers fake NIC cards that match the real owner's details. Owners who have lived abroad for a long time, and elderly owners, are named targets.
- **Brokers are unregulated.** There is no registration or certification system for real-estate brokers, and an industry body has called for it.
- **Overseas owners delay selling** because of "distance, legal procedures, documentation, and trust issues". The law lets them sell through a power of attorney and a notary without returning home. A power of attorney can also be signed at a Sri Lankan embassy.

**What it means:** "Verified" is the most valuable promise in this market, and nobody owns it. Vikkaa's evidence log, NIC-checked buyer check-ins, multi-owner signing, portal transparency and published terms make a believable verification process that others can't copy overnight.

## 2. Commission norms

- The commonly cited range is **2–5% of the sale price, usually paid by the seller**, and it is negotiable. Guides put the standard at 2–3%, or around 3–5%. No source is official.
- Stamp duty of 3–4% is paid by the buyer.

**What it means:** the planned 3% on property (about 2% on high-value deals) sits in the market range. The upfront fee is the unusual part, which is why the court flagged it. Founding terms and dealer and developer retainers solve that.

## 3. The property market in 2026 (CBSL condominium survey)

- **Q1 2026:** new condo prices in Colombo rose about 18.5% year on year, while **sales volumes fell 15.2%**. Colombo **land asking prices rose 31.9%**.
- **Q2 2026:** price growth eased (+3.2% year on year in Colombo District), and volumes fell 6.7% year on year.
- **Buyers are mostly Sri Lankan residents** buying for immediate occupancy with their own funds. Demand is shifting towards higher-priced properties.

**What it means:** developers and condo projects face slower sales at higher prices, which is exactly when marketing matters. Buyer messaging should target local owner-occupiers, not investors.

## 4. The vehicle market in 2026

- A **50% surcharge on customs import duty** (from May 2026) and a 2.5% import tax (from April 2026) pushed prices up by millions of rupees. The removal of a valuation reduction is expected to raise used-car prices further.
- **Used Japanese car dealers are struggling.** EVs and new Chinese brands are taking the lead, and many imported used vehicles remain unsold. New registrations were about 55k in January 2026 and about 52k in February 2026.

**What it means:** used-car dealers are carrying unsold stock and need to move it. A dealer retainer that sells stock faster has a clear reason to buy now. That is the strongest cash-first opportunity, and it matches the court's first condition.

## 5. Channels

- About **9–10 million social media identities** (around 39–43% of the population). **Facebook is the dominant channel at about 10.9 million users** (25–34 is the largest group), and Messenger reaches about 9.7 million. Instagram has about 2.7 million (18–24 is the largest group). YouTube's ad reach grew 8.5% in 2025. No reliable TikTok figure was found.

**What it means:** Facebook plus WhatsApp is the main channel for both seller acquisition and buyer campaigns. Instagram is for premium visuals and younger buyers. YouTube is for long walkthroughs and search. TikTok is optional reach.

## 6. Messaging rules and costs (they shape the automation design)

- **Data protection (PDPA, Act No. 9 of 2022, amended 2025):** Part IV requires **consent for direct marketing by electronic means**. Legitimate interest is *not* a valid basis for it. Consent must be specific, provable and withdrawable, and every message needs an opt-out. When Part IV takes effect is unclear (it awaits a gazette order according to most sources), so **treat it as the standard now.**
- **SMS:** sender IDs must be registered (unregistered IDs blocked from July 2026 on Dialog, Etisalat and Hutch). **Mobitel only allows OTP and transactional traffic on registered senders, so promotional SMS gets blocked.** Marketing hours are reportedly 9:00–19:00 (secondary source).
- **WhatsApp Business Platform:** charged **per message** since July 2025. Sri Lanka marketing templates cost about **US$0.07–0.08 each** (sources differ). Utility and authentication messages move to about **US$0.002** under Sri Lanka's standalone rate card from October 2026. Business-initiated messages need the recipient's opt-in under WhatsApp policy.

**What it means:**
- SMS is for **transactional messages only** (codes, reminders, receipts).
- Outreach to businesses goes out **one-to-one** from a founder (email from the app, WhatsApp from the founder's phone via a tap-to-send link), with an opt-out on every message.
- Marketing broadcasts go only to people who opted in (the Vikkaa Circle and lead forms).
- WhatsApp Cloud API is used first for cheap **utility** messages: viewing reminders, payment reminders and weekly reports.

## 7. Competitive landscape (partial)

- **Listing portals:** ikman, LankaPropertyWeb (which has an agent directory and an annual Market Outlook report), house.lk and Riyasewana. These are self-serve classified listings, the category Vikkaa positions against.
- **Agencies:** a long tail of small Colombo agencies (British Brokers, Grace Properties, Capital Trust Properties, Dina Ali Realty and others), mostly self-described, with no market-share data found.
- **Not yet researched:** listing volumes, top agents' social presence, and dealer marketing practices. Do this as a follow-up with `competitive-platform-analysis` once positioning is set.

## Sources

- [CBSL Real Estate Market Analysis 2026 Q1](https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/statistics/real_estate_market_analysis_2026_q1.pdf) · [2026 Q2](https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/statistics/real_estate_market_analysis_2026_q2.pdf)
- [FT: Colombo 1Q condominium price index up 18.5% YoY as sales volumes fall 15.2%](https://www.ft.lk/front-page/Colombo-1Q-condominium-price-index-up-18-5-YoY-as-sales-volumes-fall-15-2/44-794111) · [Daily Mirror: Colombo condo sales plunge 15.2%](https://www.dailymirror.lk/business-main/Colombo-condo-sales-plunge-15-2-in-1Q-amid-soaring-prices/245-344761)
- [Wise: How to find a real estate agent in Sri Lanka](https://wise.com/gb/blog/find-real-estate-agent-sri-lanka) · [Working with agents guide](https://locate-lanka-89604.web.app/property/guides/working-with-agents) · [LBO: broker certification should be formalized](https://lankabusinessonline.com/?p=99457)
- [Sunday Times: Property scams in Sri Lanka](https://www.sundaytimes.lk/online/features/feature-property-scams-in-sri-lanka-and-how-to-avoid-them/5-1129068) · [The Morning: fake deed racket](https://www.themorning.lk/articles/99153) · [Daily News: Tackling land forgery](https://www.dailynews.lk/2022/03/12/features/274626/tackling-land-forgery-sri-lanka) · [Ada Derana: lawyer sentenced for forged deeds](https://www.adaderana.lk/news.php?nid=119301) · [Newsfirst: PS member jailed for deed forgery](https://www.newsfirst.lk/2026/02/18/slpp-wenappuwa-ps-member-among-duo-jailed-for-land-deed-forgery)
- [Ceylon Property: selling while living overseas](https://ceylonproperty.lk/blog/how-to-sell-your-property-in-sri-lanka-while-living-overseas-complete-guide) · [MFA: affidavits / power of attorney](https://mfa.gov.lk/?p=39773) · [LankaPropertyWeb: property scams](https://www.lankapropertyweb.com/property-news/everything-you-need-to-know-on-property-scams-and-how-to-avoid-them/)
- [Daily Mirror: vehicle prices fall sharply, more drops expected](https://www.dailymirror.lk/latest-news/Vehicle-prices-fall-sharply-more-drops-expected/342-350591) · [Sunday Times: car market shifts gears, EVs outpace used Japanese](https://www.sundaytimes.lk/250706/business-times/car-market-shifts-gears-evs-outpace-used-japanese-vehicles-603101.html) · [Sunday Times: surcharge loopholes](https://www.sundaytimes.lk/260524/news/surcharge-on-vehicle-customs-import-duty-comes-with-loopholes-say-importers-642951.html) · [FT: importers brace for 2.5% tax](https://www.ft.lk/front-page/Vehicle-importers-brace-for-2-5--tax-hike-and-rising-Japanese-auction-prices/44-788339) · [EconomyNext: used cars sharply up](https://economynext.com/brand-new-car-dealers-benefit-from-car-tax-revision-used-cars-hybrids-sharply-up-report-575/)
- [DataReportal: Digital 2026 Sri Lanka](https://datareportal.com/reports/digital-2026-sri-lanka) · [NapoleonCat: Facebook users in Sri Lanka](https://napoleoncat.com/stats/facebook-users-in-sri-lanka/) · [NapoleonCat: Instagram users](https://napoleoncat.com/stats/instagram-users-in-sri-lanka/)
- [DLA Piper: electronic marketing in Sri Lanka](https://www.dlapiperdataprotection.com/index.html?t=electronic-marketing&c=LK) · [DataGuidance: Sri Lanka](https://www.dataguidance.com/jurisdiction/sri-lanka) · [Digital Privacy Regs: Sri Lanka 2026](https://digitalprivacyregs.com/sri-lanka.html) · [BizAdvisor: PDPA 2027](https://bizadvisor.lk/blog/personal-data-protection-act-sri-lanka-2027)
- [Twilio: Sri Lanka SMS guidelines](https://www.twilio.com/en-us/guidelines/lk/sms) · [sent.dm: Sri Lanka SMS guide](https://www.sent.dm/resources/sri-lanka-sms-guide)
- [Meta: WhatsApp Business Platform pricing](https://developers.facebook.com/docs/whatsapp/pricing) · [Alibaba Cloud: WhatsApp rate adjustments](https://www.alibabacloud.com/help/en/chatapp/whatsapp-message-rate-adjustments-and-service-conversation-message-billing) · [Gupshup changelog Oct 2026](https://partner-docs.gupshup.io/changelog/october-2026)
- [LankaPropertyWeb agent directory](https://www.lankapropertyweb.com/agents/estate_agents.php) · [LankaPropertyWeb Market Outlook 2026](https://lankapropertyweb.com/MOR26)
