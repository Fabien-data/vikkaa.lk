'use client';
import { useState, useTransition } from 'react';
import { signingLink } from './signatory-actions';

export function SigningLinkButton({ signatoryId }: { signatoryId: string }) {
  const [link, setLink] = useState<{ url: string; whatsapp: string } | null>(null);
  const [pending, start] = useTransition();

  if (link) {
    return (
      <span className="flex flex-wrap items-center gap-3 text-xs">
        <a href={link.whatsapp} target="_blank" rel="noreferrer" className="underline">
          Send on WhatsApp
        </a>
        <button type="button" className="underline" onClick={() => navigator.clipboard.writeText(link.url)}>
          Copy link
        </button>
      </span>
    );
  }
  return (
    <button type="button" disabled={pending} className="text-xs underline" onClick={() => start(async () => setLink(await signingLink(signatoryId)))}>
      Get signing link
    </button>
  );
}
