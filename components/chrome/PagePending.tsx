/**
 * Pending route body — TASK-148, CON-104.
 *
 * A route created in Phase 6 whose content arrives in Phase 7 or 8 renders
 * this. It exists so the shell, the navigation, and the static export can all
 * be verified now against a page that says plainly it is not finished, rather
 * than against invented content that would later have to be found and removed.
 *
 * Delete this component when the last `<PagePending />` goes.
 */

import { pending } from '@/content/pages';

export default function PagePending() {
  return (
    <section className="section">
      <div className="section__inner">
        <div className="page-pending">
          <p className="page-pending__eyebrow">{pending.eyebrow}</p>
          <p className="page-pending__body">{pending.body}</p>
        </div>
      </div>
    </section>
  );
}
