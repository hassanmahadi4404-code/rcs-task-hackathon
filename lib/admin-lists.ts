/**
 * Dashboard list decisions — issue #33.
 *
 * Every list's toolbar is a GET form, so its state is the address. This
 * module reads that state back safely (an address is anything anyone
 * typed), searches, sorts, and pages. The pages only render what it decided,
 * so `admin-lists.test.ts` can run it.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

/** Rows on one page of a paged list. */
export const PAGE_SIZE = 50;

/** One value of a closed set, from the address, or `fallback`. */
export function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** A 1-based page number from the address; anything that is not one is 1. */
export function pageNumber(value: unknown): number {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
}

/** A list's address with the given state; blank values are left out. */
export function listHref(base: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  return query ? `${base}?${query}` : base;
}

/** Whether any field holds the query, in any case. A blank query finds all. */
export function matchesText(fields: readonly string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || fields.some((field) => field.toLowerCase().includes(q));
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/**
 * A sorted copy. Digits compare as numbers, so roll `99` comes before
 * `2103045`; ties keep their order, so a list sorted by name stays in its
 * own order within one name.
 */
export function sortBy<T>(items: readonly T[], key: (item: T) => string, descending = false): T[] {
  const sign = descending ? -1 : 1;
  return [...items].sort((a, b) => sign * collator.compare(key(a), key(b)));
}

export interface Page<T> {
  items: T[];
  /** The page shown, after a page past the end is pulled back to the last. */
  page: number;
  pages: number;
  total: number;
  /** 1-based positions of the first and last row shown; 0 when empty. */
  first: number;
  last: number;
}

export function paginate<T>(items: readonly T[], page: number, size = PAGE_SIZE): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const shown = Math.min(Math.max(1, page), pages);
  const start = (shown - 1) * size;
  const slice = items.slice(start, start + size);
  return {
    items: slice,
    page: shown,
    pages,
    total: items.length,
    first: slice.length ? start + 1 : 0,
    last: start + slice.length,
  };
}
