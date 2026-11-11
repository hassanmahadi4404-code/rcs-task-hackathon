/**
 * The sticky Save and Cancel bar at the foot of a long form — issue #21.
 * Cancel is a link back to where the form came from; nothing is saved.
 */

import Link from 'next/link';

import { adminCopy } from '@/content/admin';

export interface ActionBarProps {
  save: string;
  cancelHref: string;
  pending?: boolean;
  /** A status line beside the buttons: saved, or what went wrong. */
  children?: React.ReactNode;
}

export default function ActionBar({ save, cancelHref, pending, children }: ActionBarProps) {
  return (
    <div className="admin-actionbar">
      <div className="admin-actionbar__status">{children}</div>
      <Link className="admin-button admin-button--quiet" href={cancelHref}>
        {adminCopy.cancel}
      </Link>
      <button type="submit" className="admin-button" disabled={pending}>
        {save}
      </button>
    </div>
  );
}
