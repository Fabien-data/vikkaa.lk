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

## Layout and type (partner's pick still open)
- The site is built on **Direction A, "Estate"** (`design/mockups/direction-a.html`):
  - Gloock headlines, Hanken Grotesk body text;
  - a hero photo inside a thin frame;
  - numbered steps;
  - a split call-to-action at the end.
- **Direction B, "Every screen"** (`design/mockups/direction-b.html`) is the alternative layout. It uses Archivo throughout, and its hero shows one property cut for TikTok, Instagram and YouTube.
- The colours now come from the brand in both cases, so the partner's choice is only about layout and typography.
- **Open question for the partner:** the logo's wordmark is a bold sans-serif. Are serif headlines (A) the contrast we want, or should headlines match the logo (B's Archivo)?
