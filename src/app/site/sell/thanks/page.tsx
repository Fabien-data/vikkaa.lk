import Link from 'next/link';

export default function SellThanks() {
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl font-semibold">Thanks — we’ve got your details</h1>
      <p className="mt-4 text-muted-foreground">
        One of us will call you within one working day to talk it through and arrange a visit.
      </p>
      <Link href="/" className="mt-8 inline-block underline">
        Back to Vikkaa.lk
      </Link>
    </main>
  );
}
