'use client';

/**
 * Scroll-spy — TASK-064, reused by TASK-072.
 *
 * Extracted from `Header` when the page-chrome rail needed the same answer.
 * Two independent observers would have been two chances to disagree about
 * which section the reader is in, and the disagreement would have been
 * visible: the nav pill highlighting one section while the left rail marked
 * another.
 *
 * The band is the middle 10% of the viewport, so exactly one section is ever
 * "the one you are looking at". Sections with no nav entry (What We Do) leave
 * the previous entry active rather than clearing it, which is what a reader
 * expects from a progress indicator.
 *
 * TASK-146 — the consumers of this hook now live in the shared layout, so a
 * single instance outlives every client-side navigation. That makes `rearmKey`
 * load-bearing rather than cosmetic: mounted on `/team`, the hook finds none
 * of its targets in the document and gives up, and without something in its
 * dependency list that changes on navigation it would still be given up when
 * the reader arrives back on Home. Callers pass the current pathname.
 *
 * TASK-175 — the observer re-attaches itself when a target it is watching
 * leaves the document. It has to, and the reason is `TransitionSlot`: the
 * slot renders its section bare until the transition module arrives, then
 * renders the same section inside the module's wrapper. That is a different
 * element type at that position, so React unmounts the section and mounts a
 * new one. Every node this hook observed is detached, an identical-looking
 * node takes its place, and an `IntersectionObserver` holding detached
 * elements reports nothing for the rest of the session.
 *
 * The symptom was a scroll-spy that tracked the first two or three sections
 * of the home page and then froze — the rail and the nav pill both stranded
 * on whichever section the reader reached before the modules finished
 * loading. It was there before this phase and went unnoticed while the rail
 * indexed three sections; TASK-172 made it a map of all eight, which is what
 * made the freeze impossible to miss.
 */

import { useEffect, useState } from 'react';

/** Middle-band `rootMargin`. 45% trimmed from each edge leaves 10%. */
const BAND = '-45% 0px -45% 0px';

export interface ActiveSectionOptions {
  /** Value held until the observer first reports. Defaults to `hrefs[0]`. */
  initial?: string;
  /**
   * Re-runs the observer setup when it changes. Pass the current route: the
   * spied sections belong to one page, and which page is mounted is exactly
   * what invalidates the previous answer.
   */
  rearmKey?: string;
}

export function useActiveSection(
  hrefs: readonly string[],
  { initial = hrefs[0], rearmKey = '' }: ActiveSectionOptions = {},
): [string, (href: string) => void] {
  const [active, setActive] = useState<string>(initial);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | null = null;
    let observed: Element[] = [];

    const attach = () => {
      const targets = hrefs
        .map((href) => document.querySelector(href))
        .filter((node): node is Element => node !== null);
      if (targets.length === 0) return;

      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          const entered = entries.find((entry) => entry.isIntersecting);
          if (entered?.target.id) setActive(`#${entered.target.id}`);
        },
        { rootMargin: BAND, threshold: 0 },
      );

      targets.forEach((target) => observer!.observe(target));
      observed = targets;
    };

    attach();

    /* Re-attachment — TASK-175. Watching for a detached target rather than
       for any DOM change keeps this to one `isConnected` read per frame in
       which the document changed at all, and the check is skipped entirely
       once the sections have settled, because after that nothing detaches.
       Coalesced to one check per frame: the terminal's typing effect mutates
       the document on a timer, and re-querying eight selectors per character
       would be work done to find nothing. */
    let queued = false;
    const recheck = () => {
      queued = false;
      if (observed.some((node) => !node.isConnected)) attach();
    };

    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(recheck);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer?.disconnect();
    };
    // `hrefs` is a module-level constant at every call site; joining it keeps
    // the effect from re-running on an identical array literal.
  }, [hrefs.join(','), rearmKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return [active, setActive];
}

export default useActiveSection;
