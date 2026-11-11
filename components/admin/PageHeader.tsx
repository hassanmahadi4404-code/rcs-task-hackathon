/**
 * The top of every dashboard page — issue #21.
 *
 * A breadcrumb on nested pages (it replaces the old "Back to …" links), the
 * page's one `h1`, its primary action to the right of the title, and the
 * intro, folded to one line behind a native `<summary>` so the first item on
 * the page is above the fold. A click unfolds it (issue #32 made desktop fold
 * too; it was a plain paragraph there). Phones show the whole intro
 * (#46).
 */

import Link from 'next/link';

import { adminCopy } from '@/content/admin';

export interface Crumb {
  label: string;
  href: string;
}

export interface PageHeaderProps {
  title: string;
  /** The pages above this one, outermost first. The title ends the trail. */
  crumbs?: Crumb[];
  lede?: string;
  /** The page's one primary action: a link or a form styled `admin-button`. */
  action?: React.ReactNode;
  /** A status line under the title, for example a pill. */
  children?: React.ReactNode;
}

export default function PageHeader({ title, crumbs, lede, action, children }: PageHeaderProps) {
  return (
    <header className="admin-page-header">
      {crumbs && crumbs.length > 0 && (
        <nav className="admin-crumbs" aria-label={adminCopy.breadcrumb}>
          <ol>
            {crumbs.map((crumb) => (
              <li key={crumb.href}>
                <Link href={crumb.href}>{crumb.label}</Link>
              </li>
            ))}
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
      )}
      <div className="admin-page-header__row">
        <h1 className="admin-title">{title}</h1>
        {action && <div className="admin-page-header__action">{action}</div>}
      </div>
      {children}
      {lede && (
        <details className="admin-lede">
          <summary>
            <span>{lede}</span>
          </summary>
        </details>
      )}
    </header>
  );
}
