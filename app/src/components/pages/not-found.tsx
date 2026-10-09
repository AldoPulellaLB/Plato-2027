// 404 (root notFoundComponent): "This cup is empty." An empty cup seen from
// above, a last drop that never quite fills it, and three ways back.
// Namespace: nf-.
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline, RollText } from "@/components/site/text/reveal";
import { STORE_COUNT } from "@/lib/site";

import { PageLink, useHeroReveal } from "./shared";
import "./not-found.css";

const LINKS = [
  { href: "/", label: "Back to the experience", note: "From the roast to the regular" },
  { href: "/shop", label: "Shop coffee", note: "House Blend, pods, matcha and more" },
  { href: "/stores", label: "Find your Platō", note: `About ${STORE_COUNT} locations` },
];

export function NotFoundPage() {
  const { play, stage } = useHeroReveal();

  // The root head has no not-found variant; name the tab for people and screen readers.
  useEffect(() => {
    const previous = document.title;
    const ours = "Page not found | PLATŌ Coffee";
    document.title = ours;
    return () => {
      // Only restore if the next route has not already written its own title.
      if (document.title === ours) document.title = previous;
    };
  }, []);

  return (
    <main className="pg nf" id="main">
      <section aria-labelledby="nf-title" className="nf-hero" data-pg-hero={stage}>
        <div className="pg-wrap nf-grid">
          <div className="nf-copy">
            <p className="nf-code t-label pg-in">
              <span className="t-num">404</span>
              <span aria-hidden="true" className="nf-code__rule" />
              <span>Page not found</span>
            </p>
            <GhostHeadline as="h1" className="nf-title" id="nf-title" play={play} trigger="manual">
              This cup is empty.
            </GhostHeadline>
            <p className="nf-lede pg-in" style={{ "--d": "420ms" } as CSSProperties}>
              The page you are looking for has moved, or was never poured. Try one of these instead.
            </p>
            <ol className="nf-links">
              {LINKS.map((l, i) => (
                <li className="pg-in" key={l.href} style={{ "--d": `${560 + i * 80}ms` } as CSSProperties}>
                  <PageLink className="nf-link" href={l.href}>
                    <span aria-hidden="true" className="nf-link__num t-num">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="nf-link__text">
                      <RollText className="nf-link__label">{l.label}</RollText>
                      <span className="nf-link__note">{l.note}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="nf-link__arrow" size={22} strokeWidth={1.5} />
                  </PageLink>
                </li>
              ))}
            </ol>
          </div>

          <div aria-hidden="true" className="nf-visual pg-in" style={{ "--d": "200ms" } as CSSProperties}>
            <div className="nf-cup">
              <span className="nf-cup__saucer" />
              <span className="nf-cup__handle" />
              <span className="nf-cup__rim" />
              <span className="nf-cup__well" />
              <span className="nf-cup__stain" />
              <span className="nf-cup__ripple" />
              <span className="nf-cup__drop" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
