'use client';

/**
 * Site header — TASK-034, DES-005; re-homed by TASK-145 and widened by
 * TASK-146 / TASK-147.
 *
 * A verbatim port of the concept header: circular logo disc, white nav pill,
 * dark right-hand pill, hamburger, and the mobile sheet with its `--link-d`
 * stagger. The class names and therefore every rule in the legacy stylesheet
 * are unchanged.
 *
 * What Round 2 changed:
 *
 *   - The component no longer lives inside the hero column. It is rendered
 *     once by `SiteShell` into `.site-header-mount`, which overlays the top
 *     of whichever page is mounted, so all four routes share one header
 *     instance (GUD-103) and it survives client-side navigation.
 *   - Nav items are of two kinds (REQ-109). Home, About, and Join are
 *     sections of the home page; Events, Team, and Achievements are routes.
 *     `content/site.ts` marks the difference with `sectionId`, and this
 *     component is the only place that has to care: anchors are intercepted
 *     and handed to Lenis when the home page is mounted, routes go through
 *     `next/link` like any other navigation.
 *
 * Active-link state has two sources for the same reason. On Home it is
 * scroll-spy driven (TASK-064) over the three sections that have nav entries;
 * on a sub-page there is nothing to spy on, so the current route is the
 * answer. A click still sets the state immediately so the pill responds
 * before the scroll finishes; the observer confirms or corrects it on arrival.
 */

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import logoMark from '@/assets/logo-mark.svg';
import { useSmoothScroll } from '@/components/chrome/SmoothScroll';
import { achievementsPage, eventsPage } from '@/content/pages';
import { nav, navCta, navHash, type NavItem } from '@/content/site';
import { useActiveSection } from '@/hooks/use-active-section';
import type { SectionsPresent } from '@/lib/data';

/** The concept's mobile breakpoint. Matches the `max-width: 720px` block. */
const SHEET_BREAKPOINT = 720;

/** Per-link entrance step inside the sheet, in seconds. The concept's value. */
const SHEET_LINK_STAGGER = 0.05;

/** The home-page sections that carry a nav entry — the scroll-spy's targets. */
const ANCHOR_HASHES = nav
  .map(navHash)
  .filter((hash): hash is `#${string}` => hash !== null);

/**
 * `trailingSlash: true` in `next.config.ts` means `usePathname()` reports
 * `/events/`, while `content/site.ts` writes the href as `/events`. One of
 * the two has to be normalised and the content file is the one a human edits.
 */
function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
}

export interface HeaderProps extends SectionsPresent {
  /** Issue #16 — the Join pill is the site's only Join control (REQ-137),
      so a shut recruitment window removes it rather than pointing it at a
      form that is not rendered. */
  joinOpen: boolean;
}

export default function Header({ hasEvents, hasAchievements, joinOpen }: HeaderProps) {
  /* Issue #5 — no published events, no Events entry; issue #10 does the
     same for the achievements record. A route with nothing published on it
     renders nothing, and a nav entry to nothing is a dead end. */
  const items = nav.filter(
    (item) =>
      (hasEvents || item.href !== eventsPage.path) &&
      (hasAchievements || item.href !== achievementsPage.path),
  );
  const [open, setOpen] = useState(false);
  const { scrollTo } = useSmoothScroll();

  const pathname = normalizePath(usePathname() ?? '/');
  const onHome = pathname === '/';

  /* Scroll-spy — TASK-064. Shared with the page-chrome rail so the two
     indicators can never disagree about where the reader is. Returns the
     hash of the section in the middle band; on a sub-page none of its
     targets exist and it idles on its initial value, which is why the route
     takes over below. */
  const [activeHash, setActiveHash] = useActiveSection(ANCHOR_HASHES, {
    rearmKey: pathname,
  });
  const activeHref = onHome ? `/${activeHash}` : pathname;

  const burgerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  /* Escape dismissal, and auto-close when the viewport grows past the
     breakpoint — otherwise the sheet strands itself over a desktop layout. */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onResize = () => {
      if (window.innerWidth > SHEET_BREAKPOINT) close();
    };

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    document.body.classList.add('menu-open');

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      document.body.classList.remove('menu-open');
    };
  }, [open, close]);

  /* Move focus into the sheet on open, hand it back to the burger on close,
     and hold Tab inside it while it is up — TASK-074. `aria-modal` is a
     promise to assistive tech that the rest of the page is inert; without a
     real trap, Tab would walk straight out of the sheet and into content the
     sheet is covering, and the promise would be a lie. */
  useEffect(() => {
    if (!open) {
      // Only steal focus back if it is still inside the (now hidden) sheet.
      if (sheetRef.current?.contains(document.activeElement)) {
        burgerRef.current?.focus();
      }
      return;
    }

    const sheet = sheetRef.current;
    if (!sheet) return;

    /* Queried per keypress rather than cached: the sheet's contents come from
       `content/site.ts` and a link could be added or removed between opens. */
    const focusables = () =>
      Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    focusables()[0]?.focus();

    const onTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const activeInSheet = sheet.contains(document.activeElement);

      if (event.shiftKey && (document.activeElement === first || !activeInSheet)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !activeInSheet)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [open]);

  /**
   * Intercepts a click only when the destination is a section of the page
   * currently mounted. Everywhere else — a route item, or an anchor clicked
   * from a sub-page — the handler declines and `next/link` performs a real
   * navigation, which is the only thing that can get the reader to a section
   * that is not in this document.
   */
  const onNavClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      /* Unconditional, and first: every path out of this handler leaves the
         sheet behind, including the route ones that swap the page underneath
         it. Closing here rather than in an effect on `pathname` keeps it a
         consequence of the click rather than of the render that follows. */
      close();

      const hash = href.startsWith('/#') ? href.slice(1) : null;
      if (!hash || !onHome) return;

      const target = document.querySelector(hash);
      if (!target) return; // Section not mounted yet — let the browser try.

      event.preventDefault();
      setActiveHash(hash);
      scrollTo(hash);
      // Keep the address bar honest without triggering a second jump.
      window.history.replaceState(null, '', hash);
    },
    [close, onHome, scrollTo, setActiveHash],
  );

  const isActive = (item: NavItem) => activeHref === item.href;

  return (
    <>
      <header className="site-header" id="site-header">
        <Link
          href={nav[0].href}
          className="logo-btn"
          id="header-logo"
          aria-label={nav[0].label}
          data-cursor="magnetic"
          onClick={(event) => onNavClick(event, nav[0].href)}
        >
          <Image
            src={logoMark}
            alt=""
            width={52}
            height={52}
            className="logo-img"
            priority
          />
        </Link>

        <nav className="nav-pill" id="desktop-nav" aria-label="Main Navigation">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${isActive(item) ? ' active' : ''}`}
              aria-current={isActive(item) ? 'page' : undefined}
              onClick={(event) => onNavClick(event, item.href)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {joinOpen && (
          <Link
            href={navCta.href}
            className="signin-pill"
            id="desktop-signin"
            data-cursor="magnetic"
            onClick={(event) => onNavClick(event, navCta.href)}
          >
            {navCta.label}
          </Link>
        )}

        <button
          ref={burgerRef}
          type="button"
          className={`burger-btn${open ? ' open' : ''}`}
          id="burger-btn"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls="mobile-sheet"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="burger-bar" />
          <span className="burger-bar" />
          <span className="burger-bar" />
        </button>
      </header>

      <div
        className="mobile-overlay"
        id="mobile-overlay"
        hidden={!open}
        onClick={close}
      />

      <div
        ref={sheetRef}
        className="mobile-sheet"
        id="mobile-sheet"
        hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        {items.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-link${isActive(item) ? ' active' : ''}`}
            aria-current={isActive(item) ? 'page' : undefined}
            // The concept's per-link entrance stagger, computed rather than
            // hardcoded per element so a sixth nav item keeps the cadence.
            style={
              {
                '--link-d': `${(SHEET_LINK_STAGGER * (index + 1)).toFixed(2)}s`,
              } as React.CSSProperties
            }
            onClick={(event) => onNavClick(event, item.href)}
          >
            {item.label}
          </Link>
        ))}
        {joinOpen && (
          <Link
            href={navCta.href}
            className="mobile-signin"
            onClick={(event) => onNavClick(event, navCta.href)}
          >
            {navCta.label}
          </Link>
        )}
      </div>
    </>
  );
}
