'use client';

/**
 * The site's reticle cursor, for the Learner area.
 *
 * On ruetcs.org the site shell mounts this; the Starter kit's shell leaves it
 * out but keeps everything it needs: the rules in `styles/chrome.css`
 * (`.reticle`), the switch in `config/motion.ts` (`cursor`) and the
 * `--z-cursor` token. This is the missing component, written to that
 * contract: a dot on the pointer, a ring that trails it, and a ring that
 * changes shape over links, buttons and text fields.
 *
 * It never runs on touch or under reduced motion (`useMotion().cursor`), it
 * mounts only after hydration, and the native cursor is hidden only once it
 * has, so a failure leaves a usable pointer (ACC-005). If the page already
 * has a reticle, as it will after the merge, this one stands down.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { reticle } from '@/config/task-motion';
import { useMotion } from '@/hooks/use-motion-config';

type Variant = 'default' | 'link' | 'button' | 'terminal';

const TEXT_FIELDS = 'textarea, input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"])';
const BUTTONS = 'button, [role="button"], summary, label, select, input[type="file"], input[type="checkbox"]';

function variantOver(target: EventTarget | null): Variant {
  if (!(target instanceof Element)) return 'default';
  if (target.closest(TEXT_FIELDS)) return 'terminal';
  if (target.closest(BUTTONS)) return 'button';
  return target.closest('a[href]') ? 'link' : 'default';
}

const noSubscribe = () => () => {};

export default function Reticle() {
  const { cursor } = useMotion();
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [variant, setVariant] = useState<Variant>('default');
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const active = hydrated && cursor;

  useEffect(() => {
    const root = rootRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!active || !root || !dot || !ring) return;
    // The site's own reticle is already here: one cursor, not two.
    if (document.querySelectorAll('.reticle').length > 1) {
      root.hidden = true;
      return;
    }

    const { body } = document;
    body.classList.add('has-reticle', 'reticle-out');
    let x = 0;
    let y = 0;
    let ringX = 0;
    let ringY = 0;
    let frame = 0;
    let seen = false;
    let shown: Variant = 'default';

    const step = () => {
      ringX += (x - ringX) * reticle.follow;
      ringY += (y - ringY) * reticle.follow;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      const arrived = Math.abs(x - ringX) < reticle.settled && Math.abs(y - ringY) < reticle.settled;
      frame = arrived ? 0 : requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      if (!seen) {
        seen = true;
        ringX = x;
        ringY = y;
      }
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      body.classList.remove('reticle-out');
      if (!frame) frame = requestAnimationFrame(step);
      const next = variantOver(event.target);
      if (next !== shown) {
        shown = next;
        setVariant(next);
      }
    };
    const onLeave = () => body.classList.add('reticle-out');

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
      body.classList.remove('has-reticle', 'reticle-out');
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="reticle" ref={rootRef} data-variant={variant} aria-hidden="true">
      <span className="reticle__dot" ref={dotRef} />
      <span className="reticle__ring" ref={ringRef}>
        <span className="reticle__tick reticle__tick--n" />
        <span className="reticle__tick reticle__tick--e" />
        <span className="reticle__tick reticle__tick--s" />
        <span className="reticle__tick reticle__tick--w" />
      </span>
    </div>
  );
}
