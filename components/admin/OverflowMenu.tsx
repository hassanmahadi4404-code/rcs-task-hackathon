/**
 * A row's secondary actions behind `⋯` — issue #21.
 *
 * A native `<details>`, so it opens by keyboard and without JavaScript. Each
 * child is a form whose button takes `admin-menu__item` (and `--danger` for
 * a delete), which keeps the red off every row until the menu is opened.
 */

import { adminCopy } from '@/content/admin';

export default function OverflowMenu({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <details className="admin-menu">
      <summary className="admin-menu__toggle">
        <span aria-hidden="true">⋯</span>
        <span className="sr-only">{adminCopy.more.replace('{name}', name)}</span>
      </summary>
      <div className="admin-menu__panel">{children}</div>
    </details>
  );
}
