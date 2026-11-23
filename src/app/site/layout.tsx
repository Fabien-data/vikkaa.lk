import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { SmoothScroll } from '@/components/site/motion/SmoothScroll';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-brand-ink selection:bg-brand selection:text-white">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <SmoothScroll />
      <SiteHeader />
      <div id="content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
