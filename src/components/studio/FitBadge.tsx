import { RED_FLAGS, type FitFlag } from '@/server/fit-scorer';

const FLAG_TEXT: Record<FitFlag, string> = {
  testing_market: 'Just testing the market',
  overpriced: 'Priced well above market',
  document_issue: 'Document problem',
  owners_disagree: 'Owners don’t agree',
  no_exclusivity: 'Won’t sign exclusive',
  outside_wp: 'Outside Western Province',
  no_market_data: 'No market data yet',
};

export function FitBadge({ score, flags = [], showFlags = false }: { score: number | null; flags?: string[]; showFlags?: boolean }) {
  const red = flags.some((f) => RED_FLAGS.includes(f as FitFlag));
  const tone =
    score == null ? 'bg-muted text-muted-foreground' : red || score < 50 ? 'bg-red-100 text-red-800' : score < 75 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900';
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tone}`} title="Fit score">
        Fit {score ?? '—'}
        {red && !showFlags ? ' ⚑' : ''}
      </span>
      {showFlags &&
        flags.map((f) => (
          <span
            key={f}
            className={`rounded px-2 py-0.5 text-xs ${RED_FLAGS.includes(f as FitFlag) ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground'}`}
          >
            {FLAG_TEXT[f as FitFlag] ?? f}
          </span>
        ))}
    </span>
  );
}
