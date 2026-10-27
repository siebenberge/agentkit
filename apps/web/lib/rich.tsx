import { Fragment } from 'react';

/**
 * Renders `**emphasis**` markers from the dictionaries, and `` `code` `` when
 * a `code` class is given (otherwise the backticks stay as text).
 */
export function Rich({
  text,
  strong,
  code,
}: {
  text: string;
  strong?: string;
  code?: string;
}) {
  const pattern =
    code === undefined ? /(\*\*.+?\*\*)/g : /(\*\*.+?\*\*|`[^`]+`)/g;

  return text.split(pattern).map((part, i) =>
    // odd parts are the captured markup, even parts plain text
    i % 2 === 0 ? (
      <Fragment key={i}>{part}</Fragment>
    ) : part.startsWith('**') ? (
      <span key={i} className={strong}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <code key={i} className={code}>
        {part.slice(1, -1)}
      </code>
    ),
  );
}

/** Plain text without emphasis markers. */
export function plain(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}
