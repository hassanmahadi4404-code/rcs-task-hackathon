'use client';

/**
 * Dashboard shell — issue #21, replacing the #6 top bar.
 *
 * One navigation, laid out twice by `styles/admin.css`. From 1024px it is a
 * sticky left sidebar. Below that, a slim bar carries the mark, the section
 * you are in, and the site's round burger; the burger opens the same
 * navigation as a floating panel over dimmed content. While the panel is up,
 * Tab is held inside the bar and the panel, `main` is inert, Escape closes it,
 * and focus goes back to the burger.
 *
 * Without JavaScript the burger is not shown and the panel is an ordinary open
 * list under the bar, because `data-js` is only set after hydration.
 *
 * Issue #41: every dashboard link and every list's GET form navigates here,
 * on the client, so a click answers at once. Another page swaps in a
 * `PageSkeleton` in its shape until it arrives; the list in view with a new
 * search, group, or page stays and is marked `aria-busy`. The old page stays
 * mounted, only hidden, and the tab keeps its title until the new one lands.
 * Without JavaScript the links and forms still load their addresses.
 *
 * Issue #42: the clicked link carries `data-pending` until its page arrives
 * (`styles/admin.css` marks its row or tile), and a page fades in as it lands.
 *
 * Issue #43: a 404 is in no section. An unknown address matches none already;
 * a missing record under a real section says so by mounting `NoSection`.
 *
 * Issue #44: each menu item wears a decorative icon, chosen by its address.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { LayoutDashboard, Lock, type LucideIcon } from 'lucide-react';

import LogoMark from '@/components/brand/LogoMark';
import { adminCopy, adminNavGroups, adminPaths, type AdminSection } from '@/content/admin';
import { currentSection, navigationFeedback, type NavigationFeedback } from '@/lib/admin';

import PageSkeleton from './PageSkeleton';

/** Open work beside a section's name — issue #32. `label` is read in its place. */
export interface NavBadge {
  count: number;
  label: string;
}

export interface AdminShellProps {
  /** The sections this officer's role may use, in menu order. */
  sections: (Pick<AdminSection, 'label' | 'href' | 'group'> & { badge?: NavBadge })[];
  email: string;
  role: string;
  /** A `SUPER_ADMINS` account: shown with a lock, since nobody can demote it. */
  locked: boolean;
  signOut: () => Promise<void>;
  /** Where the brand mark links. Starter kit addition; defaults to `adminPaths.home`. */
  home?: string;
  children: React.ReactNode;
}

/** Each section's menu icon, by address. */
const NAV_ICONS: Record<string, LucideIcon> = {
  [adminPaths.home]: LayoutDashboard,
};

/** The layout switch in `styles/admin.css`; the panel only exists below it. */
const SIDEBAR_BREAKPOINT = 1024;

const noSubscribe = () => () => {};

const NoSectionContext = createContext<(noSection: boolean) => void>(() => {});

/** Mounted by the dashboard 404: while it shows, no menu item is current. */
export function NoSection() {
  const setNoSection = useContext(NoSectionContext);
  useEffect(() => {
    setNoSection(true);
    return () => setNoSection(false);
  }, [setNoSection]);
  return null;
}

/** Addresses under `/admin/` that are not dashboard pages; the browser loads them. */
const NOT_PAGES = [adminPaths.signIn];

export default function AdminShell({
  sections,
  email,
  role,
  locked,
  signOut,
  home = adminPaths.home,
  children,
}: AdminShellProps) {
  const pathname = usePathname() ?? '';
  // False in the server HTML, true once hydrated: the burger only exists with JS.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const chromeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const [noSection, setNoSection] = useState(false);
  const current = noSection ? undefined : currentSection(sections, pathname);
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [target, setTarget] = useState<NavigationFeedback>('busy');
  const skeleton = navigating && target !== 'busy' ? target : null;
  const pending = useRef<Element | null>(null);

  useEffect(() => {
    if (navigating) return;
    pending.current?.removeAttribute('data-pending');
    pending.current = null;
  }, [navigating]);

  useEffect(() => {
    const go = (event: Event, href: string, link?: Element) => {
      const feedback = navigationFeedback(window.location.href, href, NOT_PAGES);
      if (!feedback) return;
      event.preventDefault();
      pending.current?.removeAttribute('data-pending');
      pending.current = link ?? null;
      link?.setAttribute('data-pending', '');
      const { pathname: path, search } = new URL(href);
      setTarget(feedback);
      setOpen(false);
      startNavigation(() => router.push(path + search));
    };
    // Capture, so this runs before a `Link` handles the same click itself.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest('a[href]');
      if (link instanceof HTMLAnchorElement && !link.target && !link.hasAttribute('download')) {
        go(event, link.href, link);
      }
    };
    // Only forms that ask for GET; server-action forms have no method.
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (event.defaultPrevented || form.getAttribute('method')?.toLowerCase() !== 'get') return;
      const url = new URL(form.action);
      const fields = Array.from(new FormData(form, event.submitter), ([name, value]) => [name, String(value)]);
      url.search = new URLSearchParams(fields).toString();
      go(event, url.href);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [router]);

  const groups = [
    { id: 'overview', label: '', items: sections.filter((section) => !section.group) },
    ...adminNavGroups.map((group) => ({
      ...group,
      items: sections.filter((section) => section.group === group.id),
    })),
  ].filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!open) {
      // Only take focus back if it was left inside the panel that just closed.
      if (chromeRef.current?.contains(document.activeElement)) burgerRef.current?.focus();
      return;
    }
    const chrome = chromeRef.current;
    if (!chrome) return;

    const focusables = () =>
      Array.from(
        chrome.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((element) => element.offsetParent !== null);

    // The panel's own brand link is hidden below the breakpoint; skip it.
    focusables()
      .find((element) => panelRef.current?.contains(element))
      ?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      const inside = chrome.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first?.focus();
      }
    };
    // Past the breakpoint the panel becomes the sidebar; do not strand it open.
    const onResize = () => {
      if (window.innerWidth >= SIDEBAR_BREAKPOINT) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    document.body.classList.add('menu-open');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      document.body.classList.remove('menu-open');
    };
  }, [open]);

  return (
    <div className="admin-shell" data-js={hydrated || undefined} data-open={open || undefined}>
      <div className="admin-chrome" ref={chromeRef}>
        <header className="admin-topbar">
          <Link href={home} className="admin-brand">
            <LogoMark title="" className="admin-brand__mark logo-on-dark" />
            <span className="admin-brand__name">{adminCopy.tag}</span>
          </Link>
          {current && current.href !== home && (
            <span className="admin-topbar__section">{current.label}</span>
          )}
          <button
            ref={burgerRef}
            type="button"
            className={`burger-btn admin-topbar__burger${open ? ' open' : ''}`}
            aria-label={adminCopy.menuToggle}
            aria-expanded={open}
            aria-controls="admin-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="burger-bar" />
            <span className="burger-bar" />
            <span className="burger-bar" />
          </button>
        </header>

        <div className="admin-nav" id="admin-nav" ref={panelRef}>
          <Link href={home} className="admin-brand admin-nav__brand">
            <LogoMark title="" className="admin-brand__mark logo-on-dark" />
            <span className="admin-brand__name">{adminCopy.brand}</span>
            <span className="admin-brand__tag">{adminCopy.tag}</span>
          </Link>

          <nav className="admin-nav__links" aria-label={adminCopy.navLabel}>
            {groups.map((group) => (
              <div className="admin-nav__group" key={group.id}>
                {group.label && (
                  <p className="admin-nav__heading" id={`nav-${group.id}`}>
                    {group.label}
                  </p>
                )}
                <ul aria-labelledby={group.label ? `nav-${group.id}` : undefined}>
                  {group.items.map((section) => {
                    const here = current?.href === section.href;
                    const Icon = NAV_ICONS[section.href];
                    return (
                      <li key={section.href}>
                        <Link
                          href={section.href}
                          className="admin-nav__link"
                          aria-current={here ? (pathname === section.href ? 'page' : 'true') : undefined}
                          onClick={() => setOpen(false)}
                        >
                          {Icon && <Icon className="admin-icon admin-nav__icon" aria-hidden="true" />}
                          {section.label}
                          {section.badge && (
                            <span className="admin-nav__badge">
                              <span aria-hidden="true">{section.badge.count}</span>
                              <span className="sr-only"> {section.badge.label}</span>
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="admin-account">
            <p className="admin-account__email" title={email}>
              {email}
            </p>
            <p className="admin-account__role">
              {role}
              {locked && (
                <span className="admin-account__lock" title={adminCopy.locked}>
                  <Lock className="admin-icon" aria-hidden="true" />
                  <span className="sr-only">{adminCopy.locked}</span>
                </span>
              )}
            </p>
            <form action={signOut}>
              <button type="submit" className="admin-account__out">
                {adminCopy.signOut}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mobile-overlay admin-overlay" hidden={!open} onClick={() => setOpen(false)} />

      <main
        className="admin-main"
        id="main-content"
        tabIndex={-1}
        inert={open || undefined}
        aria-busy={(navigating && target === 'busy') || undefined}
      >
        {skeleton && <PageSkeleton shape={skeleton} />}
        <div className="admin-page-body" hidden={!!skeleton}>
          <NoSectionContext value={setNoSection}>{children}</NoSectionContext>
        </div>
      </main>
    </div>
  );
}
