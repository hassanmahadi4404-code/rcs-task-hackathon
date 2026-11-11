/**
 * Starter kit extract: only `fill`, which the dashboard pieces use. The club
 * site's version of this file holds more; nothing else from it is needed here.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

/**
 * `{key}` placeholders in a line of `content/` copy, filled from `values`;
 * an unknown key is left as typed, so a missing value shows rather than
 * vanishing.
 */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
