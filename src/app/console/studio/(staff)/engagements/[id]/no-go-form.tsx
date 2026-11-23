'use client';
import { useState, useTransition } from 'react';
import { markNoGo } from '../actions';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/studio/Field';

export function NoGoForm({ engagementId }: { engagementId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section id="no-go" className="panel border-red-200 p-5">
      <h2 className="mb-3 font-semibold">Not going ahead?</h2>
      <form
        className="grid gap-3"
        action={(form) =>
          start(async () => {
            const reason = String(form.get('reason') ?? '');
            if (!reason.trim()) return setError('Give a reason');
            setError(null);
            const r = await markNoGo(engagementId, reason, String(form.get('priceRead') ?? ''));
            setLink(r.whatsapp);
          })
        }
      >
        <Field label="Reason (internal)">
          <input name="reason" className={inputClass} />
        </Field>
        <Field label="Free price read for the seller" hint="Sent to them on WhatsApp">
          <textarea name="priceRead" rows={3} className={inputClass} />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="destructive" disabled={pending}>
            Mark as not going ahead
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="text-sm underline">
              Send the price read on WhatsApp
            </a>
          )}
        </div>
      </form>
    </section>
  );
}
