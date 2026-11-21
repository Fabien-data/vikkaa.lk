import Link from 'next/link';
import type { Asset, Buyer, EvidenceEntry } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { inputClass } from '@/components/studio/Field';
import { formatLkr } from '@/lib/money';
import { correctEvidence } from '@/app/console/studio/(staff)/buyers/actions';

const TYPE_TEXT = {
  first_contact: 'First contact',
  contact: 'Contact',
  viewing: 'Viewing',
  test_drive: 'Test drive',
  offer: 'Offer',
  correction: 'Correction',
} as const;

const when = (d: Date) => d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' });

/** Read-only record: entries are never edited, only corrected by a new entry. */
export function EvidenceTable({
  entries,
  show,
}: {
  entries: (EvidenceEntry & { buyer?: Buyer; asset?: Asset })[];
  show: 'buyer' | 'asset';
}) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">No contacts logged yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="py-2">When</th>
          <th className="py-2">What</th>
          <th className="py-2">{show === 'buyer' ? 'Buyer' : 'Asset'}</th>
          <th className="py-2">Details</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-t align-top">
            <td className="py-2">
              {when(e.happenedAt)}
              <div className="text-xs text-muted-foreground">recorded {when(e.recordedAt)}</div>
            </td>
            <td className="py-2">
              {TYPE_TEXT[e.type]} <span className="text-muted-foreground">({e.channel.replace('_', ' ')})</span>
            </td>
            <td className="py-2">
              {show === 'buyer' && e.buyer && (
                <Link href={`/studio/buyers/${e.buyer.id}`} className="underline">
                  {e.buyer.name ?? e.buyer.phone}
                </Link>
              )}
              {show === 'asset' && e.asset && (
                <Link href={`/studio/assets/${e.asset.id}`} className="underline">
                  {e.asset.title}
                </Link>
              )}
            </td>
            <td className="py-2">
              {typeof e.data.offerCents === 'number' && <div>Offer {formatLkr(e.data.offerCents)}</div>}
              {typeof e.data.notes === 'string' && <div>{e.data.notes}</div>}
              {e.data.checkin === true && <div>Checked in and confirmed Vikkaa introduced them</div>}
              {e.correctsEntryId && <div className="text-xs text-muted-foreground">Corrects an earlier entry</div>}
            </td>
            <td className="py-2">
              {e.type !== 'correction' && (
                <details>
                  <summary className="cursor-pointer text-xs underline">Correct</summary>
                  <ActionForm action={correctEvidence} submitLabel="Add correction" className="mt-2 grid gap-2">
                    <input type="hidden" name="entryId" value={e.id} />
                    <input name="notes" placeholder="What was wrong?" className={inputClass} />
                  </ActionForm>
                </details>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
