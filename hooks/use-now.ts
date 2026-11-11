'use client';

/**
 * `useNow(renderedAt)` — the clock event decisions read (issue #2, #5).
 *
 * Pages are prerendered and refreshed by revalidation, so the server HTML can
 * only know the instant it was rendered. The page passes that instant down as
 * `renderedAt`; it is the server snapshot, which is what a reader without
 * JavaScript sees and what hydration matches against, since the prop arrives
 * in the client payload unchanged. After hydration React re-renders with the
 * client snapshot, the real current time.
 *
 * ponytail: read once per page session, not ticking. A tab left open across
 * an event's end keeps the old status until reload; subscribe to a timer if
 * that ever matters.
 */

import { useSyncExternalStore } from 'react';

let clientNow: number | undefined;

const subscribe = () => () => {};
const getSnapshot = () => (clientNow ??= Date.now());

export function useNow(renderedAt: number): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => renderedAt);
}
