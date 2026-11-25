'use client';

/**
 * `useTickingNow(renderedAt)` — the clock a countdown reads.
 *
 * `hooks/use-now.ts` reads the time once per page; a countdown has to move.
 * This is the same idea with a tick: the server's instant (`renderedAt`) is
 * what a reader without JavaScript sees and what hydration matches against,
 * then every countdown on the page shares one timer, which runs only while
 * something is listening.
 */

import { useSyncExternalStore } from 'react';

import { TICK_MS } from '@/config/task-motion';

let now: number | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === undefined) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => (now ??= Date.now());

export function useTickingNow(renderedAt: number): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => renderedAt);
}
