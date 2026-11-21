import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { logEvidence } from '@/app/console/studio/(staff)/buyers/actions';

/** Log a call, message, viewing, test drive or offer. Pass buyerId (buyer page) or let staff type the buyer (asset page). */
export function LogEvidenceForm({
  assetId,
  assetOptions,
  buyerId,
  vehicle,
}: {
  assetId?: string;
  assetOptions?: { id: string; title: string }[];
  buyerId?: string;
  vehicle?: boolean;
}) {
  return (
    <ActionForm action={logEvidence} submitLabel="Log it" className="grid gap-3 sm:grid-cols-3 sm:items-end">
      {assetId && <input type="hidden" name="assetId" value={assetId} />}
      {buyerId && <input type="hidden" name="buyerId" value={buyerId} />}
      {assetOptions && (
        <Field label="Asset">
          <select name="assetId" className={inputClass}>
            {assetOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      {!buyerId && (
        <>
          <Field label="Buyer phone">
            <input name="buyerPhone" className={inputClass} />
          </Field>
          <Field label="Buyer name">
            <input name="buyerName" className={inputClass} />
          </Field>
        </>
      )}
      <Field label="What happened">
        <select name="type" defaultValue="contact" className={inputClass}>
          <option value="contact">Contact (call or message)</option>
          <option value={vehicle ? 'test_drive' : 'viewing'}>{vehicle ? 'Test drive' : 'Viewing'}</option>
          {assetOptions && <option value="test_drive">Test drive</option>}
          <option value="offer">Offer</option>
        </select>
      </Field>
      <Field label="How">
        <select name="channel" defaultValue="phone" className={inputClass}>
          <option value="phone">Phone</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="in_person">In person</option>
          <option value="email">Email</option>
          <option value="web_form">Website form</option>
        </select>
      </Field>
      <Field label="When (Sri Lanka time)" hint="Leave empty for now">
        <input name="happenedAt" type="datetime-local" className={inputClass} />
      </Field>
      <Field label="Offer (Rs)" hint="Only for offers">
        <input name="offerRupees" className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes">
          <input name="notes" className={inputClass} />
        </Field>
      </div>
    </ActionForm>
  );
}
