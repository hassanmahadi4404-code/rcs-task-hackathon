/**
 * Sub-page shell — TASK-148, ACC-105.
 *
 * `/events`, `/team`, and `/achievements` all open the same way: an eyebrow,
 * the page's one `h1`, a lede, a hairline with a telemetry caption under it,
 * and a link back to Home. Declared once so the three cannot drift apart, in
 * the way `.section` in `styles/base.css` keeps the home page's sections from
 * drifting apart.
 *
 * Sub-pages do not render the hero or its Lightfall background — the hero is
 * the home page's argument, not site furniture. What they do inherit is the
 * section rhythm: the body a caller passes in is a run of ordinary
 * `.section` elements, padded and bounded exactly as they are on Home.
 *
 * `#main-content` lands on the header's copy block, which is the skip link's
 * destination on every route (`content/site.ts`). The header band overlays
 * the top of the page, so `--header-band-h` is added to this shell's top
 * padding — the title must clear the nav pill, not sit under it.
 */

import Link from 'next/link';

import Hairline from '@/components/hud/Hairline';
import { backToHome, type PageMeta } from '@/content/pages';
import { cn } from '@/lib/utils';

export interface PageShellProps {
  page: PageMeta;
  /** The page's sections. Each should be a `.section` element of its own. */
  children?: React.ReactNode;
  className?: string;
}

export default function PageShell({ page, children, className }: PageShellProps) {
  return (
    <main className={cn('page page-shell', className)}>
      <header className="page-shell__header">
        <div className="section__inner">
          <Link href={backToHome.href} className="page-shell__back">
            <span aria-hidden="true">←</span> {backToHome.label}
          </Link>

          <div className="page-shell__titles" id="main-content" tabIndex={-1}>
            <p className="page-shell__eyebrow">{page.eyebrow}</p>
            <h1 className="page-shell__title">{page.title}</h1>
            <p className="page-shell__lede">{page.lede}</p>
          </div>

          <Hairline fade="end" className="page-shell__rule" />
          <p className="page-shell__caption">{page.caption}</p>
        </div>
      </header>

      {children}
    </main>
  );
}
