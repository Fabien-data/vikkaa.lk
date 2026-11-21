import { Check } from 'lucide-react';

/** A short "verified" checklist: each line gets the brand's tick. */
export function TickList({ items, className = '' }: { items: React.ReactNode[]; className?: string }) {
  return (
    <ul className={`grid gap-4 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3.5 text-[17px] leading-snug">
          <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-green text-white">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
