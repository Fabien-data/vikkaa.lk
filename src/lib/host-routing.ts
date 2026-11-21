import { config } from '@/lib/config';

export type RouteDecision =
  | { type: 'rewrite'; to: string }
  | { type: 'redirect'; to: string; status: 301 | 307 }
  | { type: 'pass' }
  | { type: 'notFound' };

/** URLs from the previous vikkaa.lk site → their new home (301). */
export const OLD_URL_REDIRECTS: Record<string, string> = {
  '/real-estate': '/portfolio',
  '/pricing': '/how-it-works',
  '/agents': '/sell',
  '/register': '/sell',
  '/login': '/sell',
  '/guides': '/',
  '/trust': '/how-it-works',
  '/about': '/how-it-works',
  '/contact': '/sell',
};

const INTERNAL = /^\/(site|console)(\/|$)/;

export function routeForHost(host: string, pathname: string): RouteDecision {
  const name = host.split(':')[0].toLowerCase();

  if (name === config.publicHost) {
    const target = OLD_URL_REDIRECTS[pathname];
    if (target) return { type: 'redirect', to: target, status: 301 };
    if (INTERNAL.test(pathname)) return { type: 'notFound' };
    return { type: 'rewrite', to: pathname === '/' ? '/site' : `/site${pathname}` };
  }

  if (name === config.appHost) {
    if (pathname === '/') return { type: 'redirect', to: '/studio', status: 307 };
    if (pathname.startsWith('/api/auth/')) return { type: 'pass' };
    if (INTERNAL.test(pathname)) return { type: 'notFound' };
    return { type: 'rewrite', to: `/console${pathname}` };
  }

  return { type: 'notFound' };
}
