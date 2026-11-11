/**
 * Counts in tiles — issue #21. A number is data, so it is set in monospace;
 * a word (a role, a pill) is not. #15's dashboard home uses the same grid.
 *
 * Issue #32: `href` makes the label a link that covers the whole tile, and
 * `alert` sets a count that should be zero in the error colour.
 *
 * Issue #44: `icon` sets a decorative icon before the label, and `fill`
 * stretches a short row of tiles across the column.
 */

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export interface StatTileProps {
  value: React.ReactNode;
  label: string;
  href?: string;
  alert?: boolean;
  icon?: LucideIcon;
}

export function StatTile({ value, label, href, alert, icon: Icon }: StatTileProps) {
  return (
    <div className="admin-stat" data-link={href ? true : undefined}>
      <dt className="admin-stat__label">
        {Icon && <Icon className="admin-icon admin-stat__icon" aria-hidden="true" />}
        {href ? <Link href={href}>{label}</Link> : label}
      </dt>
      <dd
        className="admin-stat__value"
        data-number={typeof value === 'number' || undefined}
        data-alert={alert || undefined}
      >
        {value}
      </dd>
    </div>
  );
}

export default function StatGrid({ children, fill }: { children: React.ReactNode; fill?: boolean }) {
  return (
    <dl className="admin-stats" data-fill={fill || undefined}>
      {children}
    </dl>
  );
}
