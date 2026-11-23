'use client';
import { useState, useTransition } from 'react';

/** Fetches a signed link from a (bound) server action, then offers WhatsApp send and copy. */
export function ShareLinkButton({
  getLink,
  label,
}: {
  getLink: () => Promise<{ url: string; whatsapp: string } | { error: string }>;
  label: string;
}) {
  const [link, setLink] = useState<{ url: string; whatsapp: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (link) {
    return (
      <span className="flex flex-wrap items-center gap-3 text-xs">
        <a href={link.whatsapp} target="_blank" rel="noreferrer" className="underline">
          Send on WhatsApp
        </a>
        <button
          type="button"
          className="underline"
          onClick={async () => {
            await navigator.clipboard.writeText(link.url);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        disabled={pending}
        className="underline"
        onClick={() =>
          start(async () => {
            const r = await getLink();
            if ('error' in r) setError(r.error);
            else setLink(r);
          })
        }
      >
        {label}
      </button>
      {error && (
        <span role="alert" className="text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
