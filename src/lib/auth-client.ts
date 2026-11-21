'use client';
import { createAuthClient } from 'better-auth/react';
import { twoFactorClient, organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [twoFactorClient(), organizationClient()],
});
