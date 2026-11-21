// Mixes the music bed and every SFX cue the composition emitted (work/cues.json) into work/mix.wav.
// SFX share one bus: softened top end + a short shared room so they sit inside the music, not on top of it.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SFX = path.join(ROOT, 'composition', 'assets', 'sfx');
const cues = JSON.parse(readFileSync(path.join(ROOT, 'work', 'cues.json'), 'utf8'));
const DUR = 29.5;
const file = (name) => {
  if (name.startsWith('key')) return path.join(SFX, `${name}.wav`);
  return path.join(SFX, ['whoosh', 'shutter'].includes(name) ? `${name}.wav` : `${name}.ogg`);
};

const inputs = ['-i', path.join(ROOT, 'composition', 'assets', 'music', 'track.mp3')];
const chains = [];
cues.forEach((c, i) => {
  inputs.push('-i', file(c.name));
  const ms = Math.max(0, Math.round(c.t * 1000));
  chains.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${c.gain.toFixed(3)},adelay=${ms}|${ms}[s${i}]`);
});
const sfxBus = `${cues.map((_, i) => `[s${i}]`).join('')}amix=inputs=${cues.length}:normalize=0:dropout_transition=0,highshelf=f=7500:g=-4,aecho=0.8:0.55:28|61:0.16|0.09,volume=0.9[sfx]`;
const music = `[0:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=0.82,afade=t=in:st=0:d=0.25,afade=t=out:st=28.15:d=1.35[mus]`;
const master = `[mus][sfx]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=false,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:${DUR},aresample=48000[out]`;
const SOLO = process.env.SFX_ONLY === '1'; // balance check: render the SFX bus alone
const graph = [...chains, sfxBus, ...(SOLO ? ['[0:a]anullsink', '[sfx]anull[out]'] : [music, master])].join(';\n');
writeFileSync(path.join(ROOT, 'work', 'mix.filter'), graph);
const out = path.join(ROOT, 'work', SOLO ? 'sfx.wav' : 'mix.wav');
const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-/filter_complex', path.join(ROOT, 'work', 'mix.filter'), '-map', '[out]', '-ar', '48000', '-ac', '2', out], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('wrote', out, cues.length, 'cues');
