// Background images of the landing page (public/bg/, WebP). Below the fold they
// load lazily; inside a `[data-loop]` panel the zoom starts once it is on screen.
import type { SceneName } from '~/lib/content';

export function Scene({
  name,
  priority = false,
  pan = false,
  position = 'center',
  className = '',
}: {
  name: SceneName;
  /** Above the fold: load eagerly. */
  priority?: boolean;
  /** Slow camera pan instead of the one-off zoom. */
  pan?: boolean;
  /** CSS object-position of the image. */
  position?: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/bg/${name}.webp`}
        alt=""
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={`size-full object-cover ${pan ? 'animate-pan' : 'animate-zoom'}`}
        style={{ objectPosition: position }}
      />
    </div>
  );
}
