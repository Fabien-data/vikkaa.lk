'use client';
import { useEffect } from 'react';
import { recordView } from './actions';

/** Records one view after the page has run JavaScript; crawlers and link previews do not run it. */
export function PitchBeacon({ token }: { token: string }) {
  useEffect(() => {
    void recordView(token);
  }, [token]);
  return null;
}
