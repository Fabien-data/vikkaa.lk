import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { clients, engagements, assets, type Asset } from '@/db/schema';
import { CLIENT_TYPES, ASSET_CATEGORIES, ASSET_KINDS, kindCategory, type AssetKind } from '@/lib/enums';
import { normalisePhone } from '@/lib/phone';
import { rupeesToCents } from '@/lib/money';
import { config } from '@/lib/config';
import {
  COMMISSION_BP,
  DEFAULT_EXCLUSIVE_DAYS,
  DEFAULT_FOLLOW_ON_MONTHS,
  DEFAULT_ORG_ID,
  DISTRICTS,
  WESTERN_PROVINCE,
} from '@/lib/rules';
import { scoreFit, type IntakeAnswers } from '@/server/fit-scorer';
import { rangeFor } from '@/server/area-prices';
import { sendEmail } from '@/server/email';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);
const optionalNumber = optionalText.transform((v, ctx) => {
  if (v === undefined) return undefined;
  const n = Number(v.replace(/,/g, ''));
  if (Number.isFinite(n) && n > 0) return n;
  ctx.addIssue({ code: 'custom', message: 'Enter a number' });
  return z.NEVER;
});
const yesNo = z.enum(['yes', 'no']).transform((v) => v === 'yes');

export const sellerIntakeSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name'),
    phone: z.string().transform((v, ctx) => {
      const phone = normalisePhone(v);
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number' });
        return z.NEVER;
      }
      return phone;
    }),
    email: optionalText.pipe(z.email('Enter a valid email').optional()),
    clientType: z.enum(CLIENT_TYPES),
    category: z.enum(ASSET_CATEGORIES),
    kind: z.enum(ASSET_KINDS),
    district: z.enum(DISTRICTS, 'Choose a district'),
    area: z.string().trim().min(2, 'Enter the town or area'),
    askingPriceRupees: z.string().transform((v, ctx) => {
      try {
        const cents = rupeesToCents(v);
        if (cents > 0) return cents;
      } catch {}
      ctx.addIssue({ code: 'custom', message: 'Enter the asking price in rupees' });
      return z.NEVER;
    }),
    timeline: z.enum(['0-3m', '3-6m', '6m+', 'testing']),
    documents: z.enum(['clean', 'minor', 'dispute', 'lease_owed']),
    ownersAgree: yesNo,
    exclusiveOk: yesNo,
    reason: optionalText,
    bedrooms: optionalNumber,
    bathrooms: optionalNumber,
    landPerches: optionalNumber,
    floorAreaSqft: optionalNumber,
    make: optionalText,
    model: optionalText,
    year: optionalNumber,
    mileageKm: optionalNumber,
    website: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (kindCategory(v.kind) !== v.category) {
      ctx.addIssue({ code: 'custom', path: ['kind'], message: 'Choose a type that matches the category' });
    }
  });

export type SellerIntakeInput = z.output<typeof sellerIntakeSchema>;

const KIND_NAMES: Record<AssetKind, string> = {
  house: 'house',
  apartment: 'apartment',
  land: 'land',
  commercial: 'commercial property',
  car: 'car',
  suv: 'SUV',
  van: 'van',
  other: 'property',
};

function titleFor(i: SellerIntakeInput): string {
  if (i.category === 'vehicle' && i.make && i.model) {
    return [i.year, i.make, i.model].filter(Boolean).join(' ');
  }
  if (i.kind === 'land' && i.landPerches) return `${i.landPerches} perch land, ${i.area}`;
  if (i.bedrooms && (i.kind === 'house' || i.kind === 'apartment')) {
    return `${i.bedrooms}-bed ${KIND_NAMES[i.kind]}, ${i.area}`;
  }
  const name = KIND_NAMES[i.kind];
  return `${name[0].toUpperCase()}${name.slice(1)}, ${i.area}`;
}

function slugFor(title: string): string {
  const suffix = Array.from(randomBytes(6), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${suffix}`;
}

function detailsFor(i: SellerIntakeInput): Asset['details'] {
  const picked =
    i.category === 'vehicle'
      ? { make: i.make, model: i.model, year: i.year, mileageKm: i.mileageKm }
      : { bedrooms: i.bedrooms, bathrooms: i.bathrooms, landPerches: i.landPerches, floorAreaSqft: i.floorAreaSqft };
  return Object.fromEntries(Object.entries(picked).filter(([, v]) => v !== undefined)) as Asset['details'];
}

/** Saves a public seller intake as client + intake engagement + draft asset, scores it, and tells staff. */
export async function submitSellerIntake(input: SellerIntakeInput): Promise<{ engagementId: string }> {
  const answers: IntakeAnswers = {
    timeline: input.timeline,
    documents: input.documents,
    ownersAgree: input.ownersAgree,
    exclusiveOk: input.exclusiveOk,
    inWesternProvince: WESTERN_PROVINCE.includes(input.district),
  };
  const title = titleFor(input);

  const { engagementId, asset } = await db.transaction(async (tx) => {
    let [client] = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.organizationId, DEFAULT_ORG_ID), eq(clients.phone, input.phone)));
    client ??= (
      await tx
        .insert(clients)
        .values({ type: input.clientType, name: input.name, phone: input.phone, email: input.email })
        .returning()
    )[0];

    const [engagement] = await tx
      .insert(engagements)
      .values({
        clientId: client.id,
        type: 'single',
        intakeAnswers: { ...answers, reason: input.reason },
        commissionRateBp: COMMISSION_BP[input.category],
        exclusiveDays: DEFAULT_EXCLUSIVE_DAYS,
        followOnMonths: DEFAULT_FOLLOW_ON_MONTHS,
      })
      .returning();

    const [asset] = await tx
      .insert(assets)
      .values({
        engagementId: engagement.id,
        category: input.category,
        kind: input.kind,
        title,
        slug: slugFor(title),
        district: input.district,
        area: input.area,
        askingPriceCents: input.askingPriceRupees,
        details: detailsFor(input),
      })
      .returning();

    return { engagementId: engagement.id, asset };
  });

  // Scored after commit: the score is advisory and staff can recalculate it from the Studio.
  const { score, flags } = scoreFit(answers, asset.askingPriceCents, await rangeFor(asset));
  await db.update(engagements).set({ fitScore: score, fitFlags: flags }).where(eq(engagements.id, engagementId));

  if (config.staffNotifyEmails.length) {
    // The intake is already saved; a failed notification must not lose it.
    try {
      await sendEmail({
        to: config.staffNotifyEmails,
        subject: `New seller intake: ${title} (fit ${score})`,
        text: `${input.name} (${input.phone}) wants to sell: ${title}.\nOpen the Studio pipeline to follow up.`,
      });
    } catch (err) {
      console.error('New intake email failed', err);
    }
  }

  return { engagementId };
}
