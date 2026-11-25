'use client';

/**
 * A textarea that leaves the page's smooth scroll alone until it needs the
 * wheel itself.
 *
 * Lenis moves the page on every wheel event unless the element under the
 * pointer is marked `data-lenis-prevent`. A text box must be marked while its
 * own text overflows, or it could not be scrolled; marked all the time, it
 * would stop the smooth scroll whenever the pointer merely passed over it.
 * So the mark is there only while the box has more text than it shows.
 */

import { useEffect, useRef, useState } from 'react';

export default function SmoothTextarea(props: React.ComponentProps<'textarea'>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => setOverflowing(box.scrollHeight > box.clientHeight + 1);
    measure();
    // Typing, pasting, dragging the resize handle, and a form reset followed by focus.
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    box.addEventListener('input', measure);
    box.addEventListener('focus', measure);
    return () => {
      observer.disconnect();
      box.removeEventListener('input', measure);
      box.removeEventListener('focus', measure);
    };
  }, []);

  return <textarea {...props} ref={ref} data-lenis-prevent={overflowing || undefined} />;
}
