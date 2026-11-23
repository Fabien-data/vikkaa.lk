import { asc, eq } from 'drizzle-orm';
import { SubmitButton } from '@/components/studio/SubmitButton';
import { db } from '@/db';
import { signatories } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { ShareLinkButton } from '@/components/studio/ShareLinkButton';
import { removeSignatory, saveSignatory, signingLink, uploadPaperScan } from './signatory-actions';

const ROLE_TEXT = { owner: 'Owner', co_owner: 'Co-owner', poa_holder: 'Power of attorney holder' } as const;

export async function SignatoriesSection({ engagementId, signed }: { engagementId: string; signed: boolean }) {
  const rows = await db.select().from(signatories).where(eq(signatories.engagementId, engagementId)).orderBy(asc(signatories.createdAt));

  return (
    <section className="grid gap-4 panel p-5">
      <h2 className="font-semibold">Signatories</h2>
      <p className="text-sm text-muted-foreground">
        Generate the agreement draft first. Each signatory gets their own link and signs with a code sent to their phone (or email
        if they live abroad).
      </p>
      <ul className="grid gap-2">
        {rows.map((s) => {
          async function remove() {
            'use server';
            await removeSignatory(s.id, engagementId);
          }
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm">
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground">{ROLE_TEXT[s.role]}</span>
              <span>{s.phone}</span>
              {s.signedAt ? (
                <span className="chip bg-emerald-100 text-emerald-900">Signed {s.signedAt.toLocaleDateString('en-GB')}</span>
              ) : (
                <>
                  <ShareLinkButton getLink={signingLink.bind(null, s.id)} label="Get signing link" />
                  <form action={remove}>
                    <SubmitButton plain confirm="Remove this signatory?" className="text-xs text-destructive">Remove</SubmitButton>
                  </form>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {!signed && (
        <>
          <ActionForm action={saveSignatory} submitLabel="Add signatory" encType="multipart/form-data" className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <input type="hidden" name="engagementId" value={engagementId} />
            <Field label="Role">
              <select name="role" defaultValue="owner" className={inputClass}>
                <option value="owner">Owner</option>
                <option value="co_owner">Co-owner</option>
                <option value="poa_holder">Power of attorney holder</option>
              </select>
            </Field>
            <Field label="Name">
              <input name="name" className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" className={inputClass} />
            </Field>
            <Field label="Email" hint="Required if the phone is not Sri Lankan">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label="Power of attorney" hint="Required for a POA holder">
              <input name="poa" type="file" accept="application/pdf,image/*" className="text-sm" />
            </Field>
          </ActionForm>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Signed on paper instead?</h3>
            <ActionForm action={uploadPaperScan} submitLabel="Upload scan and mark signed" encType="multipart/form-data" className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="engagementId" value={engagementId} />
              <input name="scan" type="file" accept="application/pdf,image/*" className="text-sm" aria-label="Scanned agreement" />
              <input
                name="lawyerName"
                placeholder="Lawyer who drafted it (if the wording here is not approved)"
                aria-label="Lawyer who drafted the paper agreement"
                className="min-w-72 rounded-md border px-3 py-2 text-sm"
              />
            </ActionForm>
          </div>
        </>
      )}
    </section>
  );
}
