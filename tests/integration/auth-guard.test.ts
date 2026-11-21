import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { user, member } from '@/db/schema';

const getSession = vi.fn();
vi.mock('@/server/auth', () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { requireStaff } from '@/server/auth-guard';

describe('requireStaff', () => {
  beforeEach(() => getSession.mockReset());

  it('redirects to /login without a session', async () => {
    getSession.mockResolvedValue(null);
    await expect(requireStaff()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects to /login when the user is not a member of an organization', async () => {
    await db.insert(user).values({ id: 'u2', name: 'X', email: 'x@x.lk', emailVerified: true });
    getSession.mockResolvedValue({ user: { id: 'u2' }, session: { id: 's' } });
    await expect(requireStaff()).rejects.toThrow('REDIRECT:/login');
  });

  it('returns user and organization for staff', async () => {
    await db.insert(user).values({ id: 'u1', name: 'You', email: 'you@x.lk', emailVerified: true });
    await db.insert(member).values({ id: 'm1', userId: 'u1', organizationId: 'org_vikkaa', role: 'owner', createdAt: new Date() });
    getSession.mockResolvedValue({ user: { id: 'u1' }, session: { id: 's' } });
    await expect(requireStaff()).resolves.toEqual({ userId: 'u1', organizationId: 'org_vikkaa' });
  });
});
