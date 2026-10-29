'use client';

import { useEffect, useRef, useState } from 'react';

export type SubNavItem = {
  /** Anchor on this page, without `#`. */
  id: string;
  label: string;
  /** Further sections that belong to this item (e.g. the three «new» sections). */
  also?: string[];
};

/**
 * Second bar under the header on the kit pages and the error codes: the
 * sections of this page, the one on screen highlighted. Scrolls sideways on
 * small screens. `html:has([data-subnav])` makes room for it when jumping to
 * an anchor (globals.css).
 */
export function SubNav({
  title,
  items,
  label,
}: {
  /** Name of the page, on the left; jumps back to the top. */
  title: React.ReactNode;
  items: SubNavItem[];
  /** Accessible name of the `<nav>`. */
  label: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // The section that crosses a line a third down the screen.
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const item of items) {
        for (const id of [item.id, ...(item.also ?? [])]) {
          const box = document.getElementById(id)?.getBoundingClientRect();
          if (box && box.top <= line && box.bottom > line) current = item.id;
        }
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  // Keep the highlighted link in view when the list scrolls sideways.
  useEffect(() => {
    const ul = list.current;
    const link = ul?.querySelector<HTMLElement>('[aria-current]');
    if (!ul || !link || ul.scrollWidth <= ul.clientWidth) return;
    const left = link.offsetLeft - (ul.clientWidth - link.offsetWidth) / 2;
    ul.scrollTo({ left, behavior: 'smooth' });
  }, [active]);

  return (
    <div
      data-subnav
      className="sticky top-15 z-30 border-b border-line bg-bg/80 backdrop-blur-xl"
    >
      <nav
        aria-label={label}
        className="mx-auto flex h-12 w-full max-w-[1360px] items-center pl-4 sm:px-8 lg:px-10"
      >
        <a
          href="#"
          className="flex shrink-0 items-center gap-2 pr-4 text-sm font-semibold sm:pr-6"
        >
          {title}
        </a>
        <span className="h-5 w-px shrink-0 bg-line" />
        <ul
          ref={list}
          className="flex h-full min-w-0 items-stretch gap-1 overflow-x-auto pl-2 pr-4 text-sm [mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] [scrollbar-width:none] sm:gap-2 sm:pl-4 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <li key={item.id} className="flex shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? 'location' : undefined}
                className="relative flex items-center whitespace-nowrap px-2 text-muted transition hover:text-fg aria-[current]:text-fg after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-fg after:opacity-0 after:transition aria-[current]:after:opacity-100"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
