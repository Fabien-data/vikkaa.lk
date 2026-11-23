# Vikkaa visual direction

## Brand (from the founders' brand board, 21 November 2026)
- **Logo:** "Vikkaa" wordmark whose V is a tick (verified). Source files are in `Vikkaa Assests/Vikka/`.
  - Web-ready versions are in `public/brand/`: `logo.png` (green), `logo-white.png`, `mark.png` (tick only), app icons, and `og.jpg` (link previews).
  - Rebuild them with `pnpm exec tsx scripts/build-brand-assets.ts`.
- **Colours:**
  - deep green `#0b281e`: header, hero, dark sections, text
  - green `#1d6649`: buttons, links and highlights on light backgrounds
  - supporting: mist `#EDF1EE`, sage `#6E8579`
  - On dark backgrounds, buttons are white with deep-green text, like the logo.
  - There is no gold. Direction A's brass accent was a guess and has been dropped.
- **Tokens:** set in `src/app/globals.css` under `@theme`: `brand`, `brand-ink`, `brand-green`, `mist`, `sage`.

## Direction: "Verified cinema" (21 November 2026; replaces A and B below)

**Idea.** Every page should feel like the opening of a property film, and every promise is "verified", like the tick in the logo. Visitors are sellers deciding whether to trust two people with the biggest sale of their lives. The site has to *show* the craft (cinematic imagery, motion, 3D) rather than describe it, and it must never feel like a classifieds portal.

**Reference.** primelands.lk, for its concept only. We take the same ideas and make them ours; nothing is copied:
- full-bleed cinematic photography;
- a floating frosted-glass nav;
- warm off-white pages broken up by deep-colour bands with big rounded corners;
- thin line art;
- giant outlined words behind headings;
- counters and scroll reveals.

**Tokens** (`src/app/globals.css`):
- Light backgrounds:
  - `paper` #f6f5f1 is the default page background (the off-white of the brand board's cards);
  - `mist` for alternating bands.
- Dark backgrounds:
  - `brand` #0b281e;
  - `night` #03150f;
  - the `bg-glow` utility (the brand board's diagonal green glow), with `grain` on top.
- Text:
  - `brand-ink` for headings;
  - `ink-soft` #4b6156 for body copy on paper or mist (AA). Don't use `sage` for body copy: it fails contrast;
  - `mint` for highlights on dark backgrounds.
- Accents:
  - `brand-green` on light backgrounds;
  - `glow` #3aa876 on dark backgrounds only;
  - `signal` #ee1c25, the brand board's notification badge, only for "live" dots and counts.

**Type:**
- Instrument Serif (`font-display`) for headlines. Put one word or phrase per headline in *italic*: mint on dark, brand-green on light.
- Hanken Grotesk for everything else.
- The `eyebrow` utility for small uppercase labels.
- This settles the partner's question: the serif carries the emotion and the bold sans (the logo) carries the structure.

**Shapes:**
- Feature bands are inset 12px from the screen edges on mobile and 24px on desktop, with `rounded-[2.5rem]` corners. This echoes the app icon and the floating header.
- Photos use `rounded-[1.5rem]`.
- Buttons are the pill classes `.btn` with `.btn-primary`, `.btn-light`, `.btn-ghost` or `.btn-outline`.
- Content width is `w-[min(1320px,100%-40px)]`.

**Motifs** (use them, don't overuse them):
- `<TickLine>`, the logo tick drawn as line art on scroll (`src/components/site/motion/TickLine.tsx`, path in `tick.ts`).
- `text-outline` giant words behind headings.
- The signal badge.
- `bg-glow` with `grain`.
- `motion-safe:animate-ken-burns` on hero photos.

**Motion:**
- The tools are GSAP with ScrollTrigger and SplitText, and Lenis smooth scrolling (already mounted in the site layout).
- Below the fold, use `<Reveal>`, `<SplitReveal>` and `<CountUp>` from `src/components/site/motion/`.
- Above the fold, use CSS only, so nothing flashes before hydration: `motion-safe:animate-rise`, or `motion-safe:animate-line` inside an `overflow-hidden` span for headline lines, with staggered `animationDelay`.
- Everything respects `prefers-reduced-motion`. Use expo-out easing and keep durations at 1.3s or less.
- Pinning or scroll-jacking is allowed only in the deliberate story sections.

**3D:**
- three.js, loaded lazily on the client only (`next/dynamic` with `ssr: false` inside a client component).
- Cap the device pixel ratio at 1.75 on desktop and 2 on mobile. Phone canvases are small, and 1.25 made the phone screens blurry.
- Pause when the scene is off-screen or the tab is hidden.
- Show a static fallback when there's no WebGL or the visitor prefers reduced motion.
- Dispose of everything on unmount.

**Imagery.** Use `STOCK` from `src/components/site/stock.ts` (free Unsplash photos, several of them shot in Sri Lanka) until Vikkaa's own shoots replace them. Real listings always use their own photos.

**Honesty rule.** Never invent statistics, testimonials, client names, awards or founder photos. Counters may only state true facts about the service (for example "1 visit to shoot everything", or "Rs 0 until you approve the plan").

## Studio edition (app.vikkaa.lk, 23 November 2026)

The working app uses the same brand, tuned for daily use.

- **Scope.** `src/app/console/layout.tsx` wraps every app page in `.app`, which maps shadcn's tokens to the brand. Pages using `bg-background`, `bg-muted`, `text-muted-foreground` or `bg-primary` are themed automatically. The public site is not affected.
- **Canvas and surfaces.** Pages sit on paper with a faint green glow. Sections use the `panel` utility: a white surface with `rounded-[1.25rem]` corners, a hairline border and a soft green-tinted shadow.
- **Shell.** On desktop there is a fixed `bg-glow grain` sidebar, with nav grouped into Sell / Deliver / Run, lucide icons and a mint active bar. On mobile it becomes a top bar with an accessible drawer. Sign out lives in the sidebar footer.
- **Type.** Page `h1`s use `page-title` (Instrument Serif). Small section labels use `eyebrow`. Hero headlines put one italic phrase in mint.
- **Controls.**
  - Buttons are pills; primary is deep green and turns brand green on hover.
  - Inputs are `inputClass`: rounded-xl, with a brand-green focus ring.
  - Status tags use the `chip` utility.
- **Motion.**
  - `(staff)/template.tsx` adds `.page-enter`, so each page's sections rise in a short stagger.
  - `skeleton` shimmers while a page loads, and `live-dot` pulses for live counts.
  - All of it is off under `prefers-reduced-motion`.
- **Signature screens.** The war room opens with a cinematic hero (greeting, today's numbers, a pitch ring). The login page is a split screen with a photo. The client portal has a glow hero and big serif enquiry counts.

## Earlier layout and type options (superseded by "Verified cinema")
- The site is built on **Direction A, "Estate"** (`design/mockups/direction-a.html`):
  - Gloock headlines, Hanken Grotesk body text;
  - a hero photo inside a thin frame;
  - numbered steps;
  - a split call-to-action at the end.
- **Direction B, "Every screen"** (`design/mockups/direction-b.html`) is the alternative layout. It uses Archivo throughout, and its hero shows one property cut for TikTok, Instagram and YouTube.
- The colours now come from the brand in both cases, so the partner's choice is only about layout and typography.
- **Open question for the partner:** the logo's wordmark is a bold sans-serif. Are serif headlines (A) the contrast we want, or should headlines match the logo (B's Archivo)?
