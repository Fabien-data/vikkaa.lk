import type { Client } from '@/db/schema';
import { Field, inputClass } from '@/components/studio/Field';

export function ClientFields({ client }: { client?: Client }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {client && <input type="hidden" name="id" value={client.id} />}
      <Field label="Name">
        <input name="name" defaultValue={client?.name} required className={inputClass} />
      </Field>
      <Field label="Phone">
        <input name="phone" defaultValue={client?.phone} required className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={client?.email ?? ''} className={inputClass} />
      </Field>
      <Field label="Type">
        <select name="type" defaultValue={client?.type ?? 'private'} className={inputClass}>
          <option value="private">Private seller</option>
          <option value="overseas">Living abroad</option>
          <option value="dealer">Vehicle dealer</option>
          <option value="developer">Developer or builder</option>
          <option value="agent">Agent</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes">
          <textarea name="notes" rows={3} defaultValue={client?.notes ?? ''} className={inputClass} />
        </Field>
      </div>
    </div>
  );
}
