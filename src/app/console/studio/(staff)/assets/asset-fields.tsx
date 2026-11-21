'use client';
import { useState } from 'react';
import type { Asset } from '@/db/schema';
import { Field, inputClass } from '@/components/studio/Field';
import { DISTRICTS } from '@/lib/rules';
import { kindCategory, type AssetKind } from '@/lib/enums';

const KINDS: [AssetKind, string][] = [
  ['house', 'House'],
  ['apartment', 'Apartment'],
  ['land', 'Land'],
  ['commercial', 'Commercial'],
  ['other', 'Other property'],
  ['car', 'Car'],
  ['suv', 'SUV'],
  ['van', 'Van'],
];

const rupees = (cents: number | null | undefined) => (cents ? String(cents / 100) : '');

export function AssetFields({ asset, engagementId }: { asset?: Asset; engagementId?: string }) {
  const [kind, setKind] = useState<AssetKind>(asset?.kind ?? 'house');
  const vehicle = kindCategory(kind) === 'vehicle';
  const d = asset?.details ?? {};
  const detail = (name: string, label: string, placeholder?: string) => (
    <Field label={label}>
      <input name={`details.${name}`} defaultValue={d[name] ?? ''} placeholder={placeholder} className={inputClass} />
    </Field>
  );

  return (
    <div className="grid gap-4">
      {asset && <input type="hidden" name="id" value={asset.id} />}
      {engagementId && <input type="hidden" name="engagementId" value={engagementId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as AssetKind)} className={inputClass}>
            {KINDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title" hint="Shown publicly, e.g. 4-bed house with garden, Nugegoda">
          <input name="title" defaultValue={asset?.title} required className={inputClass} />
        </Field>
        <Field label="District">
          <select name="district" defaultValue={asset?.district ?? 'Colombo'} className={inputClass}>
            {DISTRICTS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Town or area">
          <input name="area" defaultValue={asset?.area} required className={inputClass} />
        </Field>
        <Field label="Address" hint="Private. Never shown publicly.">
          <input name="address" defaultValue={asset?.address ?? ''} className={inputClass} />
        </Field>
        <Field label="YouTube link">
          <input name="youtubeUrl" defaultValue={asset?.youtubeUrl ?? ''} placeholder="https://youtu.be/…" className={inputClass} />
        </Field>
        <Field label="Asking price (Rs)">
          <input name="askingPriceRupees" defaultValue={rupees(asset?.askingPriceCents)} required className={inputClass} />
        </Field>
        <Field label="Recommended price (Rs)" hint="From the market report">
          <input name="recommendedPriceRupees" defaultValue={rupees(asset?.recommendedPriceCents)} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {vehicle ? (
          <>
            {detail('make', 'Make', 'Toyota')}
            {detail('model', 'Model', 'Aqua')}
            {detail('year', 'Year', '2017')}
            {detail('mileageKm', 'Mileage (km)')}
            {detail('fuel', 'Fuel', 'Hybrid')}
            {detail('transmission', 'Transmission', 'Automatic')}
          </>
        ) : (
          <>
            {detail('bedrooms', 'Bedrooms')}
            {detail('bathrooms', 'Bathrooms')}
            {detail('landPerches', 'Land (perches)')}
            {detail('floorAreaSqft', 'Floor area (sq ft)')}
          </>
        )}
      </div>
      <Field label="Description" hint="Shown publicly">
        <textarea name="description" rows={6} defaultValue={asset?.description ?? ''} className={inputClass} />
      </Field>
    </div>
  );
}
