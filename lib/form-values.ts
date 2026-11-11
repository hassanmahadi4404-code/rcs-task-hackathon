/**
 * Dashboard form primitives — issue #9.
 *
 * The three decisions every admin form makes about a raw string before it
 * becomes a column: trim it, turn "not filled in" into one value rather than
 * two, and refuse a URL that is not `https`. Shared by `admin-events.ts` and
 * `admin-team.ts` so the answer cannot differ between two forms that ask the
 * same question. `rows` reads a repeated field (#10, #65) the same way for
 * every form that has one.
 *
 * No `@/` imports: Node's test runner executes the modules that import this
 * file directly.
 */

/** A form field as typed, with the whitespace taken off. */
export function text(value: string | undefined): string {
  return (value ?? '').trim();
}

/** Empty strings become SQL nulls, so "not set" is one value and not two. */
export function nullable(value: string | undefined): string | null {
  return text(value) || null;
}

/**
 * A repeated field as one row per index, e.g. a hero counter or a working
 * plan step. Every control is submitted, filled in or not, so the columns
 * of a row stay aligned with each other.
 */
export function rows<T>(formData: FormData, names: Record<keyof T, string>): T[] {
  const keys = Object.keys(names) as (keyof T)[];
  const columns = keys.map((key) => formData.getAll(names[key]).map(String));
  const length = Math.max(0, ...columns.map((column) => column.length));
  return Array.from({ length }, (_, index) =>
    Object.fromEntries(keys.map((key, column) => [key, columns[column][index] ?? ''])),
  ) as T[];
}

/**
 * Whether a URL is `https`. The same rule is a `check` constraint on every
 * URL column, so a bug here cannot widen what the database accepts.
 */
export function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}
