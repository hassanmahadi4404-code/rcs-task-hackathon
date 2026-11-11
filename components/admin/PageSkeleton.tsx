/**
 * The page a dashboard click is loading, as grey bones — issue #41,
 * replacing the #31 `loading.tsx` rows. `AdminShell` shows it the moment a
 * link or a list's form is used, in the shape `navigationFeedback` picks for
 * the address: a list, a record's stat tiles and sections, or a form's
 * fields. It shimmers unless motion is reduced (`styles/admin.css`).
 */

import { adminCopy } from '@/content/admin';
import type { PageShape } from '@/lib/admin';

const ROWS = 6;
const TILES = 3;
const SECTIONS = 2;
const FIELDS = 4;

const bones = (count: number, className: string) =>
  Array.from({ length: count }, (_, index) => <div className={className} key={index} />);

export default function PageSkeleton({ shape }: { shape: PageShape }) {
  return (
    <div className={`admin-skeleton admin-skeleton--${shape}`} role="status" aria-busy="true">
      <span className="sr-only">{adminCopy.loading}</span>
      {shape !== 'list' && <div className="admin-skeleton__crumb" />}
      <div className="admin-skeleton__title" />
      {shape === 'list' && (
        <>
          <div className="admin-skeleton__bar" />
          {bones(ROWS, 'admin-skeleton__row')}
        </>
      )}
      {shape === 'record' && (
        <>
          <div className="admin-skeleton__tiles">{bones(TILES, 'admin-skeleton__tile')}</div>
          {bones(SECTIONS, 'admin-skeleton__section')}
        </>
      )}
      {shape === 'form' &&
        Array.from({ length: FIELDS }, (_, index) => (
          <div className="admin-skeleton__field" key={index}>
            <div className="admin-skeleton__label" />
            <div className="admin-skeleton__input" />
          </div>
        ))}
    </div>
  );
}
