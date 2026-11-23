import { requireStaff } from '@/server/auth-guard';
import { getSettings, type SettingsSection } from '@/server/settings';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { saveSettingsSection } from './actions';
import { SettingsNav } from './settings-nav';

const rupees = (cents: number) => (cents ? String(cents / 100) : '');
const pct = (bp: number) => String(bp / 100);

function Section({ section, title, hint, children }: { section: SettingsSection; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-sm text-muted-foreground">{hint}</p>}
      <ActionForm action={saveSettingsSection} submitLabel={`Save ${title.toLowerCase()}`}>
        <input type="hidden" name="section" value={section} />
        <div className="grid gap-4 sm:grid-cols-3">{children}</div>
      </ActionForm>
    </section>
  );
}

export default async function SettingsPage() {
  await requireStaff();
  const s = await getSettings();
  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <h1 className="page-title">Settings</h1>
        <SettingsNav current="/studio/settings" />
      </header>

      <Section section="runway" title="Runway" hint="Feeds the war room: months of runway and the survival number. Update the cash figure weekly.">
        <Field label="Both founders' monthly cost (Rs)">
          <input name="monthlyCostRupees" defaultValue={rupees(s.runway.monthlyCostCents)} className={inputClass} />
        </Field>
        <Field label="Cash on hand (Rs)">
          <input name="cashOnHandRupees" defaultValue={rupees(s.runway.cashOnHandCents)} className={inputClass} />
        </Field>
        <Field label="Cash figure as of">
          <input type="date" name="asOf" defaultValue={s.runway.asOf} className={inputClass} />
        </Field>
        <Field label="Gate C: recurring revenue must cover (%)" hint="Share of monthly cost">
          <input name="gateCSharePercent" defaultValue={pct(s.runway.gateCShareBp)} className={inputClass} />
        </Field>
        <Field label="Delivery cost per client a month (Rs)" hint="Travel, contractors, tools. Replace the estimate with real costs">
          <input name="directCostPerClientRupees" defaultValue={rupees(s.runway.directCostPerClientCents)} className={inputClass} />
        </Field>
      </Section>

      <Section section="gates" title="Gates" hint="The court's checkpoints. Gate B missed means Plan B.">
        <Field label="Gate A">
          <input type="date" name="a" defaultValue={s.gates.a} className={inputClass} />
        </Field>
        <Field label="Gate B">
          <input type="date" name="b" defaultValue={s.gates.b} className={inputClass} />
        </Field>
        <Field label="Gate C">
          <input type="date" name="c" defaultValue={s.gates.c} className={inputClass} />
        </Field>
      </Section>

      <Section section="commission" title="Commission defaults" hint="Used for new engagements. Each engagement keeps its own copy once created.">
        <Field label="Property commission (%)">
          <input name="propertyPercent" defaultValue={pct(s.commission.propertyBp)} className={inputClass} />
        </Field>
        <Field label="High-value commission (%)">
          <input name="highValuePercent" defaultValue={pct(s.commission.highValueBp)} className={inputClass} />
        </Field>
        <Field label="High-value from (Rs)" hint="Leave blank to never apply">
          <input name="highValueThresholdRupees" defaultValue={rupees(s.commission.highValueThresholdCents)} className={inputClass} />
        </Field>
        <Field label="Vehicle commission (%)">
          <input name="vehiclePercent" defaultValue={pct(s.commission.vehicleBp)} className={inputClass} />
        </Field>
        <Field label="Vehicle minimum commission (Rs)">
          <input name="vehicleMinRupees" defaultValue={rupees(s.commission.vehicleMinCents)} className={inputClass} />
        </Field>
        <Field label="Exclusive period (days)">
          <input name="exclusiveDays" defaultValue={s.commission.exclusiveDays} className={inputClass} />
        </Field>
        <Field label="Follow-on period (months)">
          <input name="followOnMonths" defaultValue={s.commission.followOnMonths} className={inputClass} />
        </Field>
      </Section>

      <Section section="limits" title="Limits" hint="Court guardrails: founding terms for the first few only, and no more live campaigns than two people can run.">
        <Field label="Founding clients (max)">
          <input name="foundingCap" defaultValue={s.limits.foundingCap} className={inputClass} />
        </Field>
        <Field label="Live campaigns at once (max)">
          <input name="maxLiveCampaigns" defaultValue={s.limits.maxLiveCampaigns} className={inputClass} />
        </Field>
      </Section>

      <Section section="messaging" title="Messaging limits" hint="Marketing and outreach only go out inside these hours (Sri Lanka time). Receipts and reminders are never blocked.">
        <Field label="Sending starts at (hour)">
          <input name="quietStartHour" defaultValue={s.messaging.quietStartHour} className={inputClass} />
        </Field>
        <Field label="Sending stops at (hour)">
          <input name="quietEndHour" defaultValue={s.messaging.quietEndHour} className={inputClass} />
        </Field>
        <Field label="Outreach emails per founder per day">
          <input name="perSenderDailyCap" defaultValue={s.messaging.perSenderDailyCap} className={inputClass} />
        </Field>
        <Field label="Emails per day, everything" hint="Your email provider's daily limit">
          <input name="emailDailyCap" defaultValue={s.messaging.emailDailyCap} className={inputClass} />
        </Field>
        <Field label="Kept back for receipts and reminders">
          <input name="transactionalReserve" defaultValue={s.messaging.transactionalReserve} className={inputClass} />
        </Field>
      </Section>

      <Section section="bank" title="Bank details" hint="Printed on proposals and invoices. Until filled in, the deploy settings are used.">
        <Field label="Account name">
          <input name="accountName" defaultValue={s.bank.accountName} className={inputClass} />
        </Field>
        <Field label="Account number">
          <input name="accountNumber" defaultValue={s.bank.accountNumber} className={inputClass} />
        </Field>
        <Field label="Bank">
          <input name="bank" defaultValue={s.bank.bank} className={inputClass} />
        </Field>
        <Field label="Branch">
          <input name="branch" defaultValue={s.bank.branch} className={inputClass} />
        </Field>
      </Section>

      <Section section="business" title="Business">
        <Field label="Legal name">
          <input name="legalName" defaultValue={s.business.legalName} className={inputClass} />
        </Field>
        <Field label="Registration number">
          <input name="registrationNo" defaultValue={s.business.registrationNo} className={inputClass} />
        </Field>
      </Section>
    </div>
  );
}
