/**
 * A dashboard list — issue #21, made one table per page by #31.
 *
 * A table from 768px: a header row that stays pinned while the list
 * scrolls, the title first, then its data, its status pill, and its
 * controls. A page with several groups passes `groups`, and each becomes a
 * row group headed by a full-width row, so the columns line up down the
 * whole page. Below 768px each row is a compact card whose data is one
 * labelled line. The title is the row's edit link and covers the whole row;
 * the controls sit above it: at most one main action and an `OverflowMenu`.
 */

import Image from 'next/image';

import { adminCopy } from '@/content/admin';
import { initialsFor } from '@/lib/admin-team';

export interface RowGroup extends Omit<ListGroupProps, 'children'> {
  rows: React.ReactNode;
}

export interface RowListProps {
  /** Names the table for assistive tech, e.g. the page or group heading. */
  label: string;
  /** Header cells for the title and each data column, in row order. */
  columns: string[];
  /** Header for the status column; leave out when rows carry none. */
  status?: string;
  /** Several headed groups in one table; otherwise `children` are the rows. */
  groups?: RowGroup[];
  children?: React.ReactNode;
}

export default function RowList({ label, columns, status, groups, children }: RowListProps) {
  const columnCount = columns.length + (status ? 2 : 1);
  return (
    <table className="admin-rows" aria-label={label}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th scope="col" key={column}>
              {column}
            </th>
          ))}
          {status && <th scope="col">{status}</th>}
          <th scope="col">
            <span className="sr-only">{adminCopy.actions}</span>
          </th>
        </tr>
      </thead>
      {groups ? (
        groups.map((group) => (
          <tbody key={group.id} aria-labelledby={`group-${group.id}-title`}>
            <tr className="admin-rows__group" id={`group-${group.id}`}>
              <td colSpan={columnCount}>
                <GroupHeading {...group} />
              </td>
            </tr>
            {group.rows}
          </tbody>
        ))
      ) : (
        <tbody>{children}</tbody>
      )}
    </table>
  );
}

export interface RowProps {
  /** Usually a link to the row's own page; it then opens from anywhere on the row. */
  title: React.ReactNode;
  /** A `Thumb` before the title. */
  thumb?: React.ReactNode;
  /** `[column, value]` per data cell; the column labels the value on a card. */
  data?: [string, React.ReactNode][];
  status?: React.ReactNode;
  /** Arrows, one main action, and an `OverflowMenu`. */
  actions?: React.ReactNode;
}

export function Row({ title, thumb, data = [], status, actions }: RowProps) {
  return (
    <tr className="admin-rows__row">
      <th scope="row" className="admin-rows__title">
        {thumb ? (
          <div className="admin-rows__named">
            {thumb}
            {title}
          </div>
        ) : (
          title
        )}
      </th>
      {data.map(([column, cell]) => (
        <td className="admin-rows__data" data-label={column} key={column}>
          {cell}
        </td>
      ))}
      {status !== undefined && <td className="admin-rows__status">{status}</td>}
      <td className="admin-rows__actions">
        {actions && <div className="admin-rows__controls">{actions}</div>}
      </td>
    </tr>
  );
}

/**
 * A row's picture — issue #46: a cover or a photo, lazily loaded at a fixed
 * size so nothing shifts, or the name's initials when there is none. It sits
 * beside the name, so it is decorative to a screen reader.
 */
export function Thumb({ src, name }: { src?: string; name: string }) {
  /* ponytail: the full stored image, lazily; images are unoptimised, so a
     true thumbnail rendition needs a resize step at upload. */
  return src ? (
    <Image className="admin-thumb" src={src} alt="" width={40} height={40} />
  ) : (
    <span className="admin-thumb admin-thumb--initials" aria-hidden="true">
      {initialsFor(name)}
    </span>
  );
}

export interface ListGroupProps {
  /** `GroupCounts` jumps to `#group-<id>`. */
  id: string;
  label: string;
  /** Shown beside the heading; leave out for a group that is not a list. */
  count?: number;
  note?: string;
  children: React.ReactNode;
}

function GroupHeading({ id, label, count, note }: Omit<ListGroupProps, 'children'>) {
  return (
    <>
      <h2 className="admin-group__title" id={`group-${id}-title`}>
        {label} {count !== undefined && <span className="admin-group__count">{count}</span>}
      </h2>
      {note && <p className="admin-group__note">{note}</p>}
    </>
  );
}

/** A page's one headed group: an `h2`, its count, a one-line note, then the list. */
export function ListGroup({ children, ...heading }: ListGroupProps) {
  return (
    <section className="admin-group" id={`group-${heading.id}`} aria-labelledby={`group-${heading.id}-title`}>
      <GroupHeading {...heading} />
      {children}
    </section>
  );
}
