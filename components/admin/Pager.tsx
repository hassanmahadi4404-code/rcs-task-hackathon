/**
 * Previous and next under a paged list — issue #33. Links, so paging needs
 * no JavaScript and every page is an address; the rest of the list's state
 * rides along in `state`.
 */

import { adminCopy } from '@/content/admin';
import { fill } from '@/lib/admin-payments';
import { listHref, type Page } from '@/lib/admin-lists';

export default function Pager({
  path,
  state,
  page: { page, pages, total, first, last },
}: {
  path: string;
  state: Record<string, string>;
  page: Page<unknown>;
}) {
  const { pager } = adminCopy;
  const to = (n: number) => listHref(path, { ...state, page: n > 1 ? String(n) : '' });
  return (
    <nav className="admin-pager" aria-label={pager.label}>
      <p className="admin-mono">
        {fill(pager.status, { first: String(first), last: String(last), total: String(total) })}
      </p>
      {pages > 1 && (
        <ul>
          <li>
            {page > 1 ? (
              <a className="admin-button admin-button--quiet" href={to(page - 1)} rel="prev">
                {pager.previous}
              </a>
            ) : (
              <span className="admin-pager__off">{pager.previous}</span>
            )}
          </li>
          <li>
            {page < pages ? (
              <a className="admin-button admin-button--quiet" href={to(page + 1)} rel="next">
                {pager.next}
              </a>
            ) : (
              <span className="admin-pager__off">{pager.next}</span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}
