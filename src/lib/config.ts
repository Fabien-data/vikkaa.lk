import { z } from 'zod';

const e164 = z.string().regex(/^\+\d{8,15}$/, 'must be an E.164 phone number like +94771234567');
const optionalInt = z.coerce.number().int().nonnegative().default(0);

const schema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PUBLIC_HOST: z.string().min(1),
    APP_HOST: z.string().min(1),
    URL_PORT: z.string().optional(),
    DATABASE_URL: z.string().min(1),
    APP_SECRET: z.string().min(32, 'APP_SECRET must be at least 32 characters'),
    VIKKAA_PHONE: e164,
    VIKKAA_WHATSAPP: e164,
    VAT_RATE_BP: optionalInt,
    STAFF_NOTIFY_EMAILS: z.string().default(''),
    BANK_ACCOUNT_NAME: z.string().default(''),
    BANK_ACCOUNT_NUMBER: z.string().default(''),
    BANK_NAME: z.string().default(''),
    BANK_BRANCH: z.string().default(''),
    PRICE_GUIDE_PROPERTY_CENTS: optionalInt,
    PRICE_GUIDE_VEHICLE_CENTS: optionalInt,
    NOTIFY_LK_USER_ID: z.string().default(''),
    NOTIFY_LK_API_KEY: z.string().default(''),
    NOTIFY_LK_SENDER_ID: z.string().default(''),
    RESEND_API_KEY: z.string().default(''),
    MAIL_FROM: z.string().default(''),
    STORAGE_DIR: z.string().default('./storage'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    for (const key of ['NOTIFY_LK_USER_ID', 'NOTIFY_LK_API_KEY', 'NOTIFY_LK_SENDER_ID', 'RESEND_API_KEY', 'MAIL_FROM'] as const) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required in production` });
    }
  });

export type Config = ReturnType<typeof parseConfig>;

export function parseConfig(source: Record<string, string | undefined>) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const env = parsed.data;
  const production = env.NODE_ENV === 'production';
  const origin = (host: string) =>
    production ? `https://${host}` : `http://${host}${env.URL_PORT ? `:${env.URL_PORT}` : ''}`;

  return {
    production,
    publicHost: env.PUBLIC_HOST.toLowerCase(),
    appHost: env.APP_HOST.toLowerCase(),
    publicUrl: origin(env.PUBLIC_HOST.toLowerCase()),
    appUrl: origin(env.APP_HOST.toLowerCase()),
    databaseUrl: env.DATABASE_URL,
    appSecret: env.APP_SECRET,
    vikkaaPhone: env.VIKKAA_PHONE,
    vikkaaWhatsapp: env.VIKKAA_WHATSAPP,
    vatRateBp: env.VAT_RATE_BP,
    staffNotifyEmails: env.STAFF_NOTIFY_EMAILS.split(',').map((s) => s.trim()).filter(Boolean),
    bank: {
      accountName: env.BANK_ACCOUNT_NAME,
      accountNumber: env.BANK_ACCOUNT_NUMBER,
      bank: env.BANK_NAME,
      branch: env.BANK_BRANCH,
    },
    priceGuide: { propertyCents: env.PRICE_GUIDE_PROPERTY_CENTS, vehicleCents: env.PRICE_GUIDE_VEHICLE_CENTS },
    notifyLk: { userId: env.NOTIFY_LK_USER_ID, apiKey: env.NOTIFY_LK_API_KEY, senderId: env.NOTIFY_LK_SENDER_ID },
    resendApiKey: env.RESEND_API_KEY,
    mailFrom: env.MAIL_FROM,
    storageDir: env.STORAGE_DIR,
  };
}

export const config = parseConfig(process.env);
