import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, twoFactor } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { config } from '@/lib/config';

export const auth = betterAuth({
  appName: 'Vikkaa',
  baseURL: config.appUrl,
  secret: config.appSecret,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: [config.appUrl],
  plugins: [organization(), twoFactor({ issuer: 'Vikkaa' }), nextCookies()],
});
