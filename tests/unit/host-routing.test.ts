import { describe, it, expect } from 'vitest';
import { routeForHost } from '@/lib/host-routing';

describe('routeForHost', () => {
  it('rewrites public root to /site', () =>
    expect(routeForHost('vikkaa.test:3000', '/')).toEqual({ type: 'rewrite', to: '/site' }));
  it('rewrites public paths', () =>
    expect(routeForHost('VIKKAA.test', '/sell')).toEqual({ type: 'rewrite', to: '/site/sell' }));
  it('blocks internal prefixes on public host', () => {
    expect(routeForHost('vikkaa.test', '/console/studio').type).toBe('notFound');
    expect(routeForHost('vikkaa.test', '/site/sell').type).toBe('notFound');
  });
  it('app root redirects to studio', () =>
    expect(routeForHost('app.vikkaa.test', '/')).toEqual({ type: 'redirect', to: '/studio', status: 307 }));
  it('passes auth api', () =>
    expect(routeForHost('app.vikkaa.test', '/api/auth/sign-in/email').type).toBe('pass'));
  it('rewrites app paths', () =>
    expect(routeForHost('app.vikkaa.test', '/portal')).toEqual({ type: 'rewrite', to: '/console/portal' }));
  it('blocks internal prefixes on app host', () =>
    expect(routeForHost('app.vikkaa.test', '/site').type).toBe('notFound'));
  it('unknown host is notFound', () => expect(routeForHost('evil.test', '/').type).toBe('notFound'));
  it.each([
    ['/real-estate', '/portfolio'],
    ['/pricing', '/how-it-works'],
    ['/login', '/sell'],
    ['/register', '/sell'],
    ['/agents', '/sell'],
    ['/guides', '/'],
  ])('old url %s redirects 301 to %s', (from, to) =>
    expect(routeForHost('vikkaa.test', from)).toEqual({ type: 'redirect', to, status: 301 }));
});
