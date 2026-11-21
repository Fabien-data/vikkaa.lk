/**
 * The Vikkaa brand film: files and chapter timings. Plain data (no 'use client') so server code and tests can import it.
 * The real film replaces the placeholders under the same filenames and timeline, so nothing here describes how it looks.
 */
export const FILM = {
  landscape: { src: '/film/vikkaa-film-1080.mp4', poster: '/film/vikkaa-film-1080-poster.jpg' },
  vertical: { src: '/film/vikkaa-film-vertical.mp4', poster: '/film/vikkaa-film-vertical-poster.jpg' },
} as const;

export const FILM_DURATION = 29.5;

export type Chapter = { start: number; title: string; step?: string };

/** Start times in seconds. Numbered chapters are the five steps of the service. */
export const CHAPTERS: Chapter[] = [
  { start: 0, title: 'Most property is sold like this' },
  { start: 4.37, title: 'Yours deserves a campaign' },
  { start: 8.73, title: 'Vikkaa' },
  { start: 10.91, step: '01', title: 'Tell us about it' },
  { start: 13.1, step: '02', title: 'We price it with real data' },
  { start: 15.28, step: '03', title: 'We film it' },
  { start: 18.56, step: '04', title: 'Live everywhere, the same day' },
  { start: 22.92, step: '05', title: 'We handle every buyer' },
  { start: 26.19, title: 'Get a marketing plan' },
];
