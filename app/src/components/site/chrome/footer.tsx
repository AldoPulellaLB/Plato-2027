// SiteFooter: a page-height typographic poster on forest. Link columns up top,
// and at the foot the real PLATŌ wordmark, each letter rising from its own mask,
// scrubbed to scroll so the last letter lands exactly as the page ends.
import { useEffect, useRef } from "react";
import type { CSSProperties, RefObject } from "react";

import { RollText, useReveal } from "@/components/site/text/reveal";
import { Wordmark } from "@/components/site/wordmark";
import { CATEGORIES } from "@/lib/catalog";
import { prefersReducedMotion } from "@/lib/motion/smooth";
import { CONTACT, LEGAL, SOCIALS, VISIT, WORK_WITH_US } from "@/lib/site";
import type { LinkItem } from "@/lib/site";

import { ArrowRightIcon, ArrowUpIcon, ArrowUpRightIcon } from "./icons";
import { ChromeLink } from "./link";
import { FOOTER_ID, backToTop } from "./shared";
import "./footer.css";

const SHOP_LINKS: LinkItem[] = CATEGORIES.map((c) => ({ label: c.label, href: `/shop?c=${c.id}` }));

/** Per-letter window inside the scrub: each letter rises over 58% of the range, staggered evenly. */
const LETTER_SPAN = 0.58;
/** Small screens set the mark vertically (reading bottom to top), so its top letter
 *  enters the view first: the stagger runs from Ō down to P there. */
const VERTICAL_MARK = "(max-width: 639.98px)";

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

export function SiteFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const colsRef = useReveal("view", 0) as RefObject<HTMLDivElement>;
  const ctaRef = useReveal("view", 0) as RefObject<HTMLDivElement>;

  /* The wordmark reveal, scrubbed: starts as the mark enters, completes at the very end of the page. */
  useEffect(() => {
    const footer = footerRef.current;
    const mark = markRef.current;
    if (!footer || !mark) return;
    const letters = Array.from(mark.querySelectorAll<SVGGElement>("[data-letter]"));
    if (letters.length === 0 || prefersReducedMotion()) return;

    const n = letters.length;
    const step = n > 1 ? (1 - LETTER_SPAN) / (n - 1) : 0;
    const vertical = window.matchMedia(VERTICAL_MARK);
    let raf = 0;
    let near = false;
    let last = -1;

    const apply = () => {
      raf = 0;
      const vh = window.innerHeight;
      const markTop = mark.getBoundingClientRect().top;
      const footerBottom = footer.getBoundingClientRect().bottom;
      const range = Math.max(1, footerBottom - markTop);
      // At the page end footerBottom === vh. If the page cannot scroll that far, show everything.
      const p = footerBottom <= vh + 1 ? 1 : Math.min(1, Math.max(0, (vh - markTop) / range));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      mark.dataset.done = p >= 1 ? "true" : "false";
      const reverse = vertical.matches;
      for (let i = 0; i < n; i += 1) {
        const order = reverse ? n - 1 - i : i;
        const local = Math.min(1, Math.max(0, (p - order * step) / LETTER_SPAN));
        const y = (1 - easeOutQuart(local)) * 106;
        letters[i].style.transform = y < 0.01 ? "" : `translateY(${y.toFixed(3)}%)`;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLayoutChange = () => {
      last = -1;
      schedule();
    };
    vertical.addEventListener("change", onLayoutChange);

    // Only listen while the footer is close to the viewport.
    const io = new IntersectionObserver(
      ([entry]) => {
        const next = entry.isIntersecting;
        if (next === near) return;
        near = next;
        if (near) {
          window.addEventListener("scroll", schedule, { passive: true });
          window.addEventListener("resize", schedule);
          schedule();
        } else {
          window.removeEventListener("scroll", schedule);
          window.removeEventListener("resize", schedule);
          // Park the letters below their masks while far away (scrolling back up).
          last = -1;
          apply();
        }
      },
      { rootMargin: "50% 0px 50% 0px" },
    );
    io.observe(footer);
    apply();

    return () => {
      io.disconnect();
      vertical.removeEventListener("change", onLayoutChange);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      for (const g of letters) g.style.transform = "";
      delete mark.dataset.done;
    };
  }, []);

  return (
    <footer className="ftr" id={FOOTER_ID} ref={footerRef}>
      <div className="ftr-grain" aria-hidden="true">
        <div className="plato-grain" />
      </div>

      <div className="ftr-top">
        <div className="ftr-cta" ref={ctaRef}>
          <ChromeLink className="ftr-find" href="/stores">
            <span className="ftr-find__mask">
              <span className="ftr-find__text">Find your Platō</span>
            </span>
            <span aria-hidden="true" className="ftr-find__orb">
              <ArrowRightIcon className="ftr-find__arrow ftr-find__arrow--out" />
              <ArrowRightIcon className="ftr-find__arrow ftr-find__arrow--in" />
            </span>
          </ChromeLink>
          <ChromeLink className="ftr-app" href={CONTACT.loyaltyApp}>
            <RollText>Get the app</RollText>
            <span aria-hidden="true" className="ftr-app__icon">
              <ArrowUpRightIcon className="ftr-app__arrow ftr-app__arrow--out" />
              <ArrowUpRightIcon className="ftr-app__arrow ftr-app__arrow--in" />
            </span>
          </ChromeLink>
        </div>

        <div className="ftr-cols" ref={colsRef}>
          <FooterColumn i={0} id="ftr-shop" items={SHOP_LINKS} title="Shop" />
          <FooterColumn i={1} id="ftr-visit" items={VISIT} title="Visit" />
          <FooterColumn i={2} id="ftr-work" items={WORK_WITH_US} title="Work with us" />
          <section
            aria-labelledby="ftr-contact"
            className="ftr-col"
            style={{ "--i": 3 } as CSSProperties}
          >
            <h2 className="ftr-col__title t-label" id="ftr-contact">
              Contact
            </h2>
            <ul className="ftr-list">
              <li>
                <ChromeLink className="ftr-link" href={`mailto:${CONTACT.email}`}>
                  {CONTACT.email}
                </ChromeLink>
              </li>
              <li>
                <ChromeLink className="ftr-link" href={`mailto:${CONTACT.academyEmail}`}>
                  {CONTACT.academyEmail}
                </ChromeLink>
              </li>
              <li>
                <ChromeLink className="ftr-link" href={CONTACT.whatsapp}>
                  WhatsApp us
                </ChromeLink>
              </li>
              {CONTACT.hours.map((h) => (
                <li className="ftr-list__note" key={h}>
                  {h}
                </li>
              ))}
            </ul>
          </section>
          <FooterColumn i={4} id="ftr-social" items={SOCIALS} title="Follow" />
          <FooterColumn i={5} id="ftr-legal" items={LEGAL} title="Legal" />
        </div>
      </div>

      <div className="ftr-base">
        <p className="ftr-legal">© 2026 Platō Coffee. Coffee sculpted. Community included.</p>
        <button className="ftr-up" onClick={backToTop} type="button">
          <span className="ftr-up__label">Back to top</span>
          <span aria-hidden="true" className="ftr-up__icon">
            <ArrowUpIcon className="ftr-up__arrow ftr-up__arrow--out" />
            <ArrowUpIcon className="ftr-up__arrow ftr-up__arrow--in" />
          </span>
        </button>
      </div>

      <div className="ftr-mark" ref={markRef}>
        <Wordmark className="ftr-mark__svg" letterClassName="ftr-mark__letter" title="Platō" />
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  id,
  items,
  i,
}: {
  title: string;
  id: string;
  items: LinkItem[];
  i: number;
}) {
  return (
    <section aria-labelledby={id} className="ftr-col" style={{ "--i": i } as CSSProperties}>
      <h2 className="ftr-col__title t-label" id={id}>
        {title}
      </h2>
      <ul className="ftr-list">
        {items.map((item) => (
          <li key={item.href}>
            <ChromeLink className="ftr-link" external={item.external} href={item.href}>
              {item.label}
            </ChromeLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
