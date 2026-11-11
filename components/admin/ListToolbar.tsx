/**
 * A list's one-line toolbar — issue #33.
 *
 * The groups as links, then a GET form with search, sort, any folded extra
 * filters, and Apply. A group link and a submitted form both land on an
 * address, so every view works without JavaScript and can be kept or
 * shared; both start again from the first page. A group with nothing in it
 * is plain dim text with its zero, not a control. The bar is pinned over
 * the list while it scrolls (`styles/admin.css`).
 */

import { adminCopy } from '@/content/admin';
import { fill } from '@/lib/admin-payments';
import { listHref } from '@/lib/admin-lists';

export interface ToolbarGroup {
  id: string;
  label: string;
  count: number;
}

export interface ListToolbarProps {
  /** The list's address. */
  path: string;
  /** Names the group links, e.g. `Events by status`. */
  groupsLabel: string;
  /** `all` first; its link is the list with no group. */
  groups: ToolbarGroup[];
  group: string;
  /** The search field's label, shown as its placeholder. */
  search: string;
  q: string;
  sorts: { id: string; label: string }[];
  sort: string;
  /** Extra filters in force, by field name, e.g. the audit log's dates. */
  extra?: Record<string, string>;
  /** Their fields, folded behind a Filters toggle. */
  children?: React.ReactNode;
}

export default function ListToolbar({
  path,
  groupsLabel,
  groups,
  group,
  search,
  q,
  sorts,
  sort,
  extra = {},
  children,
}: ListToolbarProps) {
  const { toolbar } = adminCopy;
  const active = Object.values(extra).filter(Boolean).length;
  return (
    <div className="admin-toolbar">
      <nav className="admin-toolbar__groups" aria-label={groupsLabel}>
        <ul>
          {groups.map(({ id, label, count }) => (
            <li key={id}>
              {count > 0 || id === group ? (
                <a
                  href={listHref(path, { group: id === 'all' ? '' : id, q, sort, ...extra })}
                  aria-current={id === group ? 'true' : undefined}
                >
                  {label} <span className="admin-toolbar__n">{count}</span>
                </a>
              ) : (
                <span>
                  {label} <span className="admin-toolbar__n">{count}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {/* Keyed on the view, so fields follow the address on back and forward. */}
      <form
        key={JSON.stringify([group, q, sort, extra])}
        className="admin-toolbar__form"
        method="get"
        action={path}
        role="search"
        aria-label={search}
      >
        {group !== 'all' && <input type="hidden" name="group" value={group} />}
        <label className="sr-only" htmlFor="toolbar-q">
          {search}
        </label>
        <input
          className="admin-field__input admin-toolbar__search"
          id="toolbar-q"
          name="q"
          type="search"
          placeholder={search}
          defaultValue={q}
        />
        <label className="admin-toolbar__label" htmlFor="toolbar-sort">
          {toolbar.sort}
        </label>
        <select className="admin-field__input admin-toolbar__sort" id="toolbar-sort" name="sort" defaultValue={sort}>
          {sorts.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {children && (
          <details className="admin-toolbar__more">
            <summary className="admin-button admin-button--quiet">
              {active ? fill(toolbar.moreActive, { n: String(active) }) : toolbar.more}
            </summary>
            <div className="admin-toolbar__panel">{children}</div>
          </details>
        )}
        <button className="admin-button" type="submit">
          {toolbar.apply}
        </button>
      </form>
    </div>
  );
}
