'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Adds `.in` to `[data-reveal]` and `[data-loop]` elements while they are on
 * screen: reveals fade in once, loops pause off screen (see globals.css).
 */
export function Motion() {
  useEffect(() => {
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          reveal.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    const loop = new IntersectionObserver((entries) => {
      for (const e of entries)
        e.target.classList.toggle('in', e.isIntersecting);
    });
    document
      .querySelectorAll('[data-reveal]')
      .forEach((el) => reveal.observe(el));
    document.querySelectorAll('[data-loop]').forEach((el) => loop.observe(el));
    return () => {
      reveal.disconnect();
      loop.disconnect();
    };
  }, []);
  return null;
}

/**
 * Steps through `durations` (ms per step) in a loop while the element is on
 * screen. With reduced motion it stays on `still`.
 */
export function useSequence<T extends HTMLElement = HTMLDivElement>(
  durations: number[],
  still = 0,
) {
  const ref = useRef<T>(null);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(!!e?.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wait = durations[step] ?? 1000;
  useEffect(() => {
    if (!visible || reduced) return;
    const t = setTimeout(
      () => setStep((s) => (s + 1) % durations.length),
      wait,
    );
    return () => clearTimeout(t);
  }, [visible, reduced, step, wait, durations.length]);

  return [ref, reduced ? still : step, setStep] as const;
}
