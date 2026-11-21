import { it, expect } from 'vitest';
import { canonicalJson } from '@/lib/canonical-json';

it('sorts nested keys', () => {
  expect(canonicalJson({ b: 1, a: { d: 1, c: 2 } })).toBe('{"a":{"c":2,"d":1},"b":1}');
});

it('keeps array order and handles primitives', () => {
  expect(canonicalJson([{ b: 1, a: 2 }, 3, 'x', null])).toBe('[{"a":2,"b":1},3,"x",null]');
  expect(canonicalJson({})).toBe('{}');
});
