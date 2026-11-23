import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { prospects, user, PROSPECT_STATUSES } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { copyHash, currentStep, hasContactBasis, pitchUrl, prospectTimeline, templateVars } from '@/server/prospects';
import { isDoNotContact, OUTREACH_BASES } from '@/server/consent';
import { whatsappDraft } from '@/server/messaging';
import { getTemplate, render } from '@/server/templates';
import { listPackages } from '@/server/packages';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { SubmitButton } from '@/components/studio/SubmitButton';
import { NotesPanel } from '@/components/studio/NotesPanel';
import { TasksPanel } from '@/components/studio/TasksPanel';
import { formatLkr } from '@/lib/money';
import type { ActionResult } from '@/lib/form';
import { ProspectFields, SEGMENT_TEXT, STATUS_TEXT } from '../prospect-fields';
import { callOutcome, changeStatus, convertProspect, doNotContact, recordBasis, recordTouch, saveProspect, sendDueEmail, skipDueStep, whatsappSent } from '../actions';
import { saveProspectBooking } from '../../calendar/actions';

const when = (d: Date) => d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const CHANNEL_TEXT = { email: 'Email', whatsapp: 'WhatsApp', call: 'Call', visit: 'Visit', meeting: 'Meeting', sms: 'SMS' } as const;
const BASIS_TEXT: Record<(typeof OUTREACH_BASES)[number], string> = {
  introduction: 'Introduced by someone they know',
  inbound_request: 'They asked us to get in touch',
  asked_in_person: 'They said yes in person or on a call',
  existing_relationship: 'Existing business relationship',
};
const OUTCOME_TEXT: Record<string, string> = { no_answer: 'no answer', talked: 'talked', pitched: 'pitched', sent: 'sent', skipped: 'skipped', done: 'done' };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireStaff();
  const { id } = await params;
  const [p] = await db.select().from(prospects).where(eq(prospects.id, id));
  if (!p) notFound();

  const [staff, timeline, offers, blocked, basis] = await Promise.all([
    db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name)),
    prospectTimeline(p.id),
    listPackages({ activeOnly: true }),
    Promise.all([isDoNotContact(p.phone), isDoNotContact(p.email)]).then(([a, b]) => a || b),
    hasContactBasis(p),
  ]);
  const me = staff.find((s) => s.id === userId);
  const step = currentStep(p);
  const vars = templateVars(p, me?.name ?? 'Vikkaa');
  const template = step?.step.template ? await getTemplate(step.step.template, step.step.channel === 'email' ? 'email' : 'whatsapp') : undefined;
  const waLink = step?.step.channel === 'whatsapp' && template ? await whatsappDraft(p.phone, render(template.body, vars), 'outreach') : null;

  const emailSubject = render(template?.subject ?? '', vars);
  const emailBody = render(template?.body ?? '', vars);
  const reviewedHash = copyHash(emailSubject, emailBody);
  async function sendNow(): Promise<ActionResult> {
    'use server';
    return sendDueEmail(id, reviewedHash);
  }
  async function markSent() {
    'use server';
    await whatsappSent(id);
  }
  async function skip() {
    'use server';
    await skipDueStep(id);
  }
  async function stop() {
    'use server';
    await doNotContact(id);
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link href="/studio/prospects" className="text-sm text-muted-foreground">
          ← Prospects
        </Link>
        <h1 className="page-title">{p.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="chip bg-brand text-mint">{STATUS_TEXT[p.status]}</span>
          <span className="text-muted-foreground">{SEGMENT_TEXT[p.segment]}</span>
          {p.contactName && <span>{p.contactName}{p.contactRole ? `, ${p.contactRole}` : ''}</span>}
          {p.phone && <a href={`tel:${p.phone}`} className="underline">{p.phone}</a>}
          {p.email && <a href={`mailto:${p.email}`} className="underline">{p.email}</a>}
          {blocked && <span className="chip bg-red-100 text-red-900">Do not contact</span>}
          {p.clientId && (
            <Link href={`/studio/clients/${p.clientId}`} className="underline">
              Open client
            </Link>
          )}
        </div>
      </header>

      <section className="panel p-5" aria-labelledby="next-h">
        <h2 id="next-h" className="mb-3 font-semibold">Next step</h2>
        {blocked ? (
          <p className="text-sm text-muted-foreground">They asked not to be contacted. Nothing will be sent.</p>
        ) : step && (step.step.channel === 'email' || step.step.channel === 'whatsapp') && !basis ? (
          <p className="text-sm">
            Step {step.index + 1} is a {CHANNEL_TEXT[step.step.channel]}, which waits until you{' '}
            <a href="#basis" className="underline">
              record how you may contact them
            </a>
            . Or skip it and call or visit.
          </p>
        ) : !step ? (
          <p className="text-sm text-muted-foreground">
            {p.status === 'new' || p.status === 'contacted' ? 'The contact sequence is finished. Log a touch or change the status.' : `No automatic steps while the status is "${STATUS_TEXT[p.status]}".`}
          </p>
        ) : (
          <div className="grid gap-3 text-sm">
            <p>
              Step {step.index + 1}: <strong>{CHANNEL_TEXT[step.step.channel]}</strong>
              {p.nextActionAt && <span className="text-muted-foreground"> · due {when(p.nextActionAt)}</span>}
            </p>
            {step.step.channel === 'email' && template && (
              <>
                <div className="rounded border bg-muted/40 p-3">
                  <p className="font-medium">{emailSubject}</p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-muted-foreground">{emailBody}</pre>
                </div>
                <ActionForm action={sendNow} submitLabel="Send this email now" className="flex flex-wrap items-center gap-3">
                  <span />
                </ActionForm>
              </>
            )}
            {step.step.channel === 'whatsapp' && (
              <div className="flex flex-wrap items-center gap-3">
                {waLink ? (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="rounded-md border px-3 py-2 font-medium">
                    Open WhatsApp with the message
                  </a>
                ) : (
                  <span className="text-muted-foreground">No WhatsApp template or phone number.</span>
                )}
                <form action={markSent}>
                  <SubmitButton size="default" pendingText="Saving…">I sent it ✓</SubmitButton>
                </form>
              </div>
            )}
            {step.step.channel === 'call' && (
              <div className="flex flex-wrap items-center gap-2">
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="rounded-md border px-3 py-2 font-medium">
                    Call {p.phone}
                  </a>
                )}
                {(['no_answer', 'talked', 'pitched'] as const).map((o) => {
                  async function log() {
                    'use server';
                    await callOutcome(id, o);
                  }
                  return (
                    <form key={o} action={log}>
                      <SubmitButton pendingText="Saving…">{o === 'no_answer' ? 'No answer' : o === 'talked' ? 'Talked' : 'Pitched'}</SubmitButton>
                    </form>
                  );
                })}
              </div>
            )}
            <form action={skip}>
              <SubmitButton plain className="text-muted-foreground">
                Skip this step
              </SubmitButton>
            </form>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-3 font-semibold">Status</h2>
          <ActionForm action={changeStatus} submitLabel="Update status" className="grid gap-3">
            <input type="hidden" name="id" value={p.id} />
            <Field label="Status">
              <select name="status" defaultValue={p.status} className={inputClass}>
                {PROSPECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_TEXT[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="If lost, why?">
              <input name="lostReason" defaultValue={p.lostReason ?? ''} className={inputClass} />
            </Field>
          </ActionForm>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 font-semibold">Log a touch</h2>
          <ActionForm action={recordTouch} submitLabel="Log it" className="grid gap-3">
            <input type="hidden" name="id" value={p.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="How">
                <select name="channel" defaultValue="visit" className={inputClass}>
                  <option value="visit">Visit</option>
                  <option value="meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email (sent elsewhere)</option>
                </select>
              </Field>
              <Field label="Outcome">
                <select name="outcome" defaultValue="talked" className={inputClass}>
                  <option value="pitched">Pitched</option>
                  <option value="talked">Talked</option>
                  <option value="no_answer">No answer</option>
                  <option value="sent">Sent</option>
                </select>
              </Field>
            </div>
            <Field label="Note">
              <input name="note" className={inputClass} placeholder="Wants to see a sample shoot; call back Friday" />
            </Field>
          </ActionForm>
        </section>
      </div>

      {!blocked && (
        <section id="basis" className="panel p-5">
          <h2 className="mb-2 font-semibold">Contact basis</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {basis
              ? 'Recorded: emails and WhatsApp drafts can go to them. Record it again if the basis changes.'
              : 'Not recorded: no email or WhatsApp goes to them. A public phone number or email is not permission.'}
          </p>
          <ActionForm action={recordBasis} submitLabel="Record basis" className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <input type="hidden" name="id" value={p.id} />
            <Field label="How">
              <select name="basis" defaultValue="asked_in_person" className={inputClass}>
                {OUTREACH_BASES.map((b) => (
                  <option key={b} value={b}>
                    {BASIS_TEXT[b]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Who, when, what they agreed to">
              <input name="note" required className={inputClass} placeholder="Met Ruwan at the yard on 24 Nov; OK to email the sample report" />
            </Field>
          </ActionForm>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="mb-3 font-semibold">Book a pitch visit or call</h2>
        <ActionForm action={saveProspectBooking} submitLabel="Add to calendar" className="grid gap-3">
          <input type="hidden" name="prospectId" value={p.id} />
          <div className="grid gap-3 sm:grid-cols-5">
            <Field label="Type">
              <select name="type" defaultValue="pitch" className={inputClass}>
                <option value="pitch">Pitch visit</option>
                <option value="call">Call</option>
              </select>
            </Field>
            <Field label="When">
              <input type="datetime-local" name="startsAt" className={inputClass} />
            </Field>
            <Field label="Minutes">
              <input name="durationMinutes" defaultValue={30} inputMode="numeric" className={inputClass} />
            </Field>
            <Field label="Area">
              <input name="area" defaultValue={p.area ?? ''} className={inputClass} />
            </Field>
            <Field label="Notes">
              <input name="notes" className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </section>

      <section className="panel p-5">
        <h2 className="mb-2 font-semibold">Personal pitch page</h2>
        <p className="text-sm text-muted-foreground">
          Their own page with your offer. You are alerted the first time they open it.
          {p.pitchViews > 0 && p.pitchLastViewedAt ? ` Opened ${p.pitchViews} time${p.pitchViews === 1 ? '' : 's'}, last ${when(p.pitchLastViewedAt)}.` : ' Not opened yet.'}
        </p>
        <p className="mt-2 break-all text-sm">
          <a href={`${pitchUrl(p)}?preview=1`} target="_blank" rel="noopener noreferrer" className="underline">
            {pitchUrl(p)}
          </a>
        </p>
      </section>

      {!p.clientId && (
        <section className="panel p-5">
          <h2 className="mb-2 font-semibold">Won? Convert to a client</h2>
          <p className="mb-3 text-sm text-muted-foreground">Creates the client and an engagement from these details. Nothing is typed twice.</p>
          <ActionForm action={convertProspect} submitLabel="Convert to client" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={p.id} />
            <select name="packageId" defaultValue="" className={`${inputClass} max-w-md`} aria-label="Package">
              <option value="">No package yet</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({formatLkr(o.priceCents)}
                  {o.kind === 'retainer' ? ' / month' : ''})
                </option>
              ))}
            </select>
          </ActionForm>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="mb-4 font-semibold">Details</h2>
        <ActionForm action={saveProspect} submitLabel="Save details">
          <ProspectFields p={p} staff={staff} />
        </ActionForm>
        {!blocked && (
          <form action={stop} className="mt-4">
            <SubmitButton plain confirm="Stop all messages to them?" className="text-sm text-destructive">
              They asked not to be contacted
            </SubmitButton>
          </form>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 font-semibold">Timeline</h2>
        <ol className="grid gap-2 text-sm">
          {timeline.map((m) => (
            <li key={m.id} className="border-b pb-2">
              <span className="text-muted-foreground">{when(m.sentAt ?? m.createdAt)}</span> · {CHANNEL_TEXT[m.channel]}
              {m.outcome ? ` (${OUTCOME_TEXT[m.outcome] ?? m.outcome})` : ''} · {m.status}
              {m.fromName ? ` · ${m.fromName}` : ''}
              {m.subject && <span className="block font-medium">{m.subject}</span>}
              {m.blockedReason && <span className="block text-destructive">{m.blockedReason}</span>}
              {m.lastError && <span className="block text-destructive">{m.lastError}</span>}
              {m.body && m.channel !== 'email' && <span className="block text-muted-foreground">{m.body}</span>}
            </li>
          ))}
          {timeline.length === 0 && <li className="text-muted-foreground">Nothing yet.</li>}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <NotesPanel subject={{ type: 'prospect', id: p.id }} />
        <TasksPanel subject={{ type: 'prospect', id: p.id }} />
      </div>
    </div>
  );
}
