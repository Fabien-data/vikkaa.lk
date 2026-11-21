// Shared by the public site's forms (sell, buy, enquiry). Plain module so client and server files can both import it.

export const fieldInput =
  'w-full rounded-2xl border border-brand/15 bg-paper px-4 py-3.5 text-base font-normal text-brand-ink transition-[border-color,box-shadow,background-color] duration-300 placeholder:text-sage hover:border-brand/35 focus-visible:border-brand-green focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-green/20';

export const fieldLabel = 'grid content-start gap-2 text-sm font-semibold text-brand-ink';

export const fieldError = 'text-sm font-medium text-[#b42318]';

export const formAlert = 'rounded-2xl border border-[#b42318]/25 bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]';

export const checkbox = 'mt-0.5 size-5 shrink-0 accent-brand-green';

export const legend = 'eyebrow mb-5 flex w-full items-center gap-4 text-brand-green after:h-px after:flex-1 after:bg-brand/10';

export const submit = 'btn btn-primary w-full !py-4 text-base disabled:pointer-events-none disabled:opacity-60';
