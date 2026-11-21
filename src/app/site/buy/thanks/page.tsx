import Link from 'next/link';

export default function BuyThanks() {
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl font-semibold">Thanks — we’ll be in touch</h1>
      <p className="mt-4 text-muted-foreground">When something that fits comes in, you’ll hear from us first.</p>
      <Link href="/" className="mt-8 inline-block underline">
        Back to Vikkaa.lk
      </Link>
    </main>
  );
}
