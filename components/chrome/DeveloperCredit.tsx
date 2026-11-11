/**
 * The developer's credit, in both footers. A bordered chip of its own on the
 * footer's baseline rather than words in the legal line, so a reader who
 * reaches the footer notices it without it competing with the society.
 */

import { footer } from '@/content/site';

export default function DeveloperCredit() {
  const { credit } = footer;

  return (
    <a
      className="developer-credit"
      href={credit.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="developer-credit__label">{credit.label}</span>
      <span className="developer-credit__name">{credit.name}</span>
      <span className="developer-credit__arrow" aria-hidden="true">
        {credit.arrow}
      </span>
      <span className="sr-only"> {credit.newTab}</span>
    </a>
  );
}
