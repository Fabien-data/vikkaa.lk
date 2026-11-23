'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** A Studio page failed. Nothing typed is lost server-side; offer a retry and a way back. */
export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="grid max-w-xl gap-4 rounded-md border border-destructive/40 bg-background p-6">
      <h1 className="text-xl font-semibold">Something went wrong on this page</h1>
      <p className="text-sm text-muted-foreground">
        Try again. If it keeps happening, note what you clicked and the reference below.
        {error.digest ? ` Reference: ${error.digest}` : ''}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link href="/studio" className="inline-flex items-center text-sm underline">
          Back to the war room
        </Link>
      </div>
    </div>
  );
}
