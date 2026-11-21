/** "What happens next" as three numbered cards. Sits just under the fold line, so it rises in with CSS. */
export function NextSteps({ steps }: { steps: (readonly [string, string])[] }) {
  return (
    <section aria-labelledby="next-h" className="mx-auto w-[min(1320px,100%-40px)] pb-20 md:pb-28">
      <h2 id="next-h" className="eyebrow mb-8 flex items-center gap-4 text-brand-green after:h-px after:flex-1 after:bg-brand/10">
        What happens next
      </h2>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map(([h, p], i) => (
          <li
            key={h}
            className="rounded-[1.5rem] border border-brand/[0.08] bg-white p-7 motion-safe:animate-rise md:p-8"
            style={{ animationDelay: `${700 + i * 120}ms` }}
          >
            <span aria-hidden="true" className="font-display text-[44px] leading-none text-brand-green">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-6 font-display text-[28px] leading-[1.1] text-brand-ink">{h}</h3>
            <p className="mt-2.5 text-[16px] leading-relaxed text-ink-soft">{p}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
