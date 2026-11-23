export const inputClass =
  'w-full rounded-xl border border-input bg-white px-3.5 py-2.5 text-sm text-brand-ink shadow-[inset_0_1px_2px_rgb(11_40_30/0.05)] transition-[border-color,box-shadow] duration-200 placeholder:text-ink-soft/60 hover:border-brand/30 focus-visible:border-brand-green focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-green/15 disabled:opacity-60';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold text-brand-ink">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}
