/**
 * A status word in a pill — issue #21. The tone picks a `--rcs-status-*`
 * token; draft is dashed, so it reads as unfinished without a new colour.
 * `error` (issue #33) is a failed send or a deletion, in `--rcs-error`.
 */

export type StatusTone = 'live' | 'upcoming' | 'done' | 'draft' | 'off' | 'error';

export default function StatusPill({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span className="admin-pill" data-tone={tone}>
      {children}
    </span>
  );
}
