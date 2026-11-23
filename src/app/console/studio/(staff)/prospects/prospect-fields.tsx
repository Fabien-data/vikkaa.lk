import { PROSPECT_SEGMENTS, type Prospect, type ProspectStatus } from '@/db/schema';
import { Field, inputClass } from '@/components/studio/Field';

export const SEGMENT_TEXT: Record<(typeof PROSPECT_SEGMENTS)[number], string> = {
  dealer: 'Car dealer',
  developer: 'Developer / condo project',
  agent: 'Agent',
  private: 'Private seller',
  overseas: 'Owner abroad',
  other: 'Other',
};

export const STATUS_TEXT: Record<ProspectStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  meeting: 'Meeting',
  won: 'Won',
  lost: 'Lost',
  nurture: 'Later',
};

export function SegmentSelect({ value }: { value?: string }) {
  return (
    <select name="segment" defaultValue={value ?? 'dealer'} className={inputClass}>
      {PROSPECT_SEGMENTS.map((s) => (
        <option key={s} value={s}>
          {SEGMENT_TEXT[s]}
        </option>
      ))}
    </select>
  );
}

/** Every editable prospect field, for the detail page. Quick add uses a short subset. */
export function ProspectFields({ p, staff }: { p: Prospect; staff: { id: string; name: string }[] }) {
  return (
    <>
      <input type="hidden" name="id" value={p.id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Business or person">
          <input name="name" defaultValue={p.name} required className={inputClass} />
        </Field>
        <Field label="Who they are">
          <SegmentSelect value={p.segment} />
        </Field>
        <Field label="Owner">
          <select name="ownerUserId" defaultValue={p.ownerUserId ?? ''} className={inputClass}>
            <option value="">Either of us</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contact person">
          <input name="contactName" defaultValue={p.contactName ?? ''} className={inputClass} />
        </Field>
        <Field label="Their role">
          <input name="contactRole" defaultValue={p.contactRole ?? ''} placeholder="Owner, sales manager…" className={inputClass} />
        </Field>
        <Field label="Phone">
          <input name="phone" type="tel" inputMode="tel" defaultValue={p.phone ?? ''} className={inputClass} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={p.email ?? ''} className={inputClass} />
        </Field>
        <Field label="District">
          <input name="district" defaultValue={p.district ?? ''} className={inputClass} />
        </Field>
        <Field label="Area">
          <input name="area" defaultValue={p.area ?? ''} className={inputClass} />
        </Field>
        <Field label="Source" hint="Walk-in, referral, ex-agency contact, /dealers form…">
          <input name="source" defaultValue={p.source ?? ''} className={inputClass} />
        </Field>
      </div>
      <Field label="Their current listings (links)">
        <textarea name="links" rows={2} defaultValue={p.links ?? ''} className={inputClass} />
      </Field>
      <Field label="Stock or project notes" hint="What they are selling, how much, how long it has sat">
        <textarea name="stockNote" rows={3} defaultValue={p.stockNote ?? ''} className={inputClass} />
      </Field>
      <Field label="What we saw (shown on their pitch page)" hint="Facts they told you or you checked: which stock sits longest, where buyers drop out">
        <textarea name="diagnosis" rows={3} defaultValue={p.diagnosis ?? ''} className={inputClass} />
      </Field>
      <Field label="What we agreed next (shown on their pitch page)" hint="Only what they agreed to, e.g. “Call Friday after 3pm to go through the scope”">
        <input name="agreedNextStep" defaultValue={p.agreedNextStep ?? ''} className={inputClass} />
      </Field>
    </>
  );
}
