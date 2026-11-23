/**
 * Runs once when the server starts. Starts the background ticker in production (or with JOBS=on in development).
 * Off by default in development so a dev server pointed at the production database never sends real messages.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const enabled = process.env.JOBS === 'on' || (process.env.NODE_ENV === 'production' && process.env.JOBS !== 'off');
  if (!enabled) return;
  const { startTicker } = await import('./server/ticker');
  startTicker();
}
