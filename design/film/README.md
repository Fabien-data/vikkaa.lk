# The Vikkaa brand film

Built with the `/brag-slim` workflow from [latent-spaces/brag](https://github.com/latent-spaces/brag): an HTML composition where every frame is a pure function of time, rendered headless with Chrome and mixed with FFmpeg. `brag-plan.md` is the creative brief and storyboard; its chapter timings drive `src/components/site/film/chapters.ts`.

## Rebuild it

1. **Set up a workspace** (not in this repo), for example `brag-output/`:
   - `composition/`: copy `index.html` and `film.js` here.
   - `work/`
   - `render.mjs`, `mix.mjs` and `finalize.sh` in the workspace root.
2. **Fill `composition/assets/`:**
   - `fonts/`: the site's Instrument Serif (regular and italic) and Hanken Grotesk woff2 files.
   - `brand/`: `public/brand/logo-white.png`.
   - `lib/`: `gsap.min.js`, `three.module.js`, `three.core.js` and `RoomEnvironment.js`, all from `node_modules`.
   - `ts/`: `screens.ts` and `tick.ts` compiled to JavaScript with `tsc`.
   - `img/`: the `STOCK` photos from `src/components/site/stock.ts`, at `w=2400`.
   - `music/track.mp3`: brag's "Happy Beats / Business Moves Vol. 12".
   - `sfx/`: brag's Kenney sound effects, plus the designed `whoosh.wav` and `shutter.wav`. The ffmpeg recipes are in the session notes.
3. **Render:** `node render.mjs --format landscape`, then `--format vertical`. Use `--stills 1.5,9,21.6` for review frames first.
4. **Mix and export:** run `node mix.mjs`, then `bash finalize.sh`. It writes the social masters (poster baked into frame 0) and the web encodes in `public/film/`.

Music: Sascha Ende, ende.app (CC BY 4.0). It's credited in the site footer. Sound effects: Kenney (CC0). Photos: Unsplash (Unsplash License).
