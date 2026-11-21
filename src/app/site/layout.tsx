import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { SmoothScroll } from '@/components/site/motion/SmoothScroll';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-brand-ink selection:bg-brand selection:text-white">
      <SmoothScroll />
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
