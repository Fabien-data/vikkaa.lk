import { describe, it, expect } from 'vitest';
import { parseConfig } from '@/lib/config';

const valid = {
  NODE_ENV: 'development',
  PUBLIC_HOST: 'vikkaa.test',
  APP_HOST: 'app.vikkaa.test',
  DATABASE_URL: 'postgres://x',
  APP_SECRET: 'x'.repeat(32),
  VIKKAA_PHONE: '+94770000000',
  VIKKAA_WHATSAPP: '+94770000000',
};

describe('parseConfig', () => {
  it('rejects a short APP_SECRET', () => {
    expect(() => parseConfig({ ...valid, APP_SECRET: 'short' })).toThrow();
  });
  it('splits staff emails', () => {
    expect(parseConfig({ ...valid, STAFF_NOTIFY_EMAILS: 'a@x.lk, b@x.lk' }).staffNotifyEmails).toEqual([
      'a@x.lk',
      'b@x.lk',
    ]);
  });
  it('requires Notify.lk and Resend keys in production', () => {
    expect(() => parseConfig({ ...valid, NODE_ENV: 'production' })).toThrow(/NOTIFY_LK_API_KEY/);
  });
  it('builds https app url in production and http with port in dev', () => {
    expect(parseConfig({ ...valid, URL_PORT: '3000' }).appUrl).toBe('http://app.vikkaa.test:3000');
    const prod = parseConfig({
      ...valid,
      NODE_ENV: 'production',
      NOTIFY_LK_USER_ID: 'u',
      NOTIFY_LK_API_KEY: 'k',
      NOTIFY_LK_SENDER_ID: 'Vikkaa',
      RESEND_API_KEY: 'r',
      MAIL_FROM: 'hello@vikkaa.lk',
    });
    expect(prod.appUrl).toBe('https://app.vikkaa.test');
    expect(prod.publicUrl).toBe('https://vikkaa.test');
  });
  it('defaults VAT to 0', () => expect(parseConfig(valid).vatRateBp).toBe(0));
});
