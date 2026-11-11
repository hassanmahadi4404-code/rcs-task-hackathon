'use client';

/**
 * Route focus and announcement — TASK-164, ACC-105.
 *
 * Found by the Phase 10 accessibility pass. On a client-side navigation the
 * App Router swaps the page's subtree and does nothing about focus: if the
 * link that was activated lived inside that subtree — `View all events →`,
 * `Meet the full team →`, `← Back to home` — it is unmounted with it and
 * focus falls to `<body>`. A keyboard reader's position is lost and the next
 * `Tab` restarts at the skip link. Nothing is announced either; the Pages
 * Router shipped a route announcer, the App Router does not.
 *
 * Both halves are fixed here, once, in the shared shell:
 *
 * - Focus moves to the skip link's own target, which already carries
 *   `tabindex="-1"` for exactly this purpose. `preventScroll` matters: the
 *   router has just restored scroll position, and focusing without it would
 *   yank the page somewhere else a frame later.
 * - The new `document.title` is written into a polite live region. It is read
 *   a frame late on purpose — the title is committed by the metadata layer,
 *   not by this render, so reading it synchronously reads the old page's.
 *
 * A URL carrying a hash is left alone. `/#about` from a sub-page is a request
 * to land on that section, and stealing focus back to the top of `main` would
 * undo the thing the reader asked for.
 *
 * The first render is not a navigation, so it neither moves focus nor
 * announces — on a cold load the boot overlay owns the page.
 */

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { skipLink } from '@/content/site';

/** `skipLink.href` is `#main-content`; the element id is the same string bar the hash. */
const TARGET_ID = skipLink.href.replace(/^#/, '');

export default function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (previous.current === null || previous.current === pathname) {
      previous.current = pathname;
      return;
    }
    previous.current = pathname;

    if (window.location.hash) return;

    document.getElementById(TARGET_ID)?.focus({ preventScroll: true });

    const frame = requestAnimationFrame(() => setAnnouncement(document.title));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {announcement}
    </p>
  );
}
