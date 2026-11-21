/** Placeholder legal text until the lawyer's versions arrive (pre-launch checklist). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-[min(760px,100%-40px)] py-20">
      <h1 className="font-display text-5xl text-brand">{title}</h1>
      <p className="mt-4 bg-mist p-3 text-sm text-sage">Draft. Final wording is being reviewed by our lawyer.</p>
      <div className="mt-8 grid max-w-[66ch] gap-4 leading-relaxed">{children}</div>
    </main>
  );
}
