import { it, expect } from 'vitest';
import { CHAPTERS, FILM_DURATION } from '@/components/site/film/chapters';

it('keeps chapters in order within the film', () => {
  CHAPTERS.forEach((c, i) => expect(c.start).toBeGreaterThanOrEqual(i ? CHAPTERS[i - 1].start : 0));
  expect(CHAPTERS.at(-1)!.start).toBeLessThan(FILM_DURATION);
});
