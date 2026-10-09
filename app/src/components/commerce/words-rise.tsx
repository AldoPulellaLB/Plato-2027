// Headline whose words rise out of a mask with a 40ms stagger. CSS keyframes
// only, so it plays on the server's first paint and on every remount (key it to
// replay) with no hydration flash. Reduced motion shows it static.
import { Fragment, createElement } from "react";
import type { CSSProperties, ElementType } from "react";

import "./words-rise.css";

interface WordsRiseProps {
  as?: ElementType;
  text: string;
  className?: string;
  /** Delay before the first word, ms. */
  delay?: number;
  /** Words (by index) set in italic serif. */
  italicFrom?: number;
  id?: string;
}

export function WordsRise({ as = "h1", text, className, delay = 120, italicFrom, id }: WordsRiseProps) {
  const words = text.split(/\s+/).filter(Boolean);
  return createElement(
    as,
    { className: ["wr", className].filter(Boolean).join(" "), id, "aria-label": text, style: { "--wr-delay": `${delay}ms` } as CSSProperties },
    words.map((word, i) => (
      // The space sits outside the masked inline-block, where it cannot collapse.
      <Fragment key={`${word}-${i}`}>
        <span aria-hidden="true" className="wr-w">
          <span className="wr-i" data-italic={italicFrom !== undefined && i >= italicFrom ? true : undefined} style={{ "--i": i } as CSSProperties}>
            {word}
          </span>
        </span>
        {i < words.length - 1 ? " " : null}
      </Fragment>
    )),
  );
}
