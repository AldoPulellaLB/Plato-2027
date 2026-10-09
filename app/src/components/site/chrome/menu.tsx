// FullscreenMenu: a forest curtain drops from the top (a sage shutter just ahead
// of it), the page links rise one after another, and a photo preview follows the
// hovered or focused link. Modal dialog: focus is trapped, Escape closes, scroll
// is locked and focus returns to the burger on close.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";

import { RollText } from "@/components/site/text/reveal";
import { Wordmark } from "@/components/site/wordmark";
import { lockScroll, scrollToTarget } from "@/lib/motion/smooth";
import { CHAPTERS, CONTACT, PAGES, SOCIALS, VISIT, WORK_WITH_US } from "@/lib/site";
import type { ChapterId, LinkItem } from "@/lib/site";
import { ui, useUi } from "@/lib/ui";

import { BurgerLines } from "./burger";
import { ArrowDownRightIcon } from "./icons";
import { ChromeLink } from "./link";
import { MENU_ID, chrome, focusJumpTarget, useChrome, usePathname } from "./shared";
import "./menu.css";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function pageIndexFor(pathname: string) {
  const exact = PAGES.findIndex((p) => p.href === pathname);
  if (exact >= 0) return exact;
  const nested = PAGES.findIndex((p) => p.href !== "/" && pathname.startsWith(`${p.href}/`));
  return nested >= 0 ? nested : 0;
}

export function FullscreenMenu() {
  const { menuOpen: open, ready } = useUi();
  const { condensed, menuPrimed } = useChrome();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const currentIndex = pageIndexFor(pathname);

  const rootRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  /** Set by a chapter jump: on close, focus lands on the chapter instead of the burger. */
  const jumpedRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(currentIndex);
  const [prev, setPrev] = useState<number | null>(null);

  // Each open starts on the page you are on.
  useEffect(() => {
    if (!open) return;
    chrome.primeMenu();
    setActive(currentIndex);
    setPrev(null);
  }, [open, currentIndex]);

  // Warm the preview photography once the visitor has settled in (wide, hover
  // screens only: primeMenu ignores the rest, where the preview is not shown).
  useEffect(() => {
    if (!ready || menuPrimed) return;
    const id = window.setTimeout(() => chrome.primeMenu(), 6000);
    return () => window.clearTimeout(id);
  }, [ready, menuPrimed]);

  // Modal behaviour: lock scroll, trap focus, Escape closes, restore focus.
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    if (!root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockScroll(true);
    const focusTimer = window.setTimeout(
      () => firstLinkRef.current?.focus({ preventScroll: true }),
      80,
    );

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        ui.setMenu(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !root.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !root.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      lockScroll(false);
      const jumped = jumpedRef.current;
      jumpedRef.current = null;
      if (jumped && document.contains(jumped)) focusJumpTarget(jumped);
      else if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [open]);

  const show = (index: number) => {
    if (index === active) return;
    setPrev(active);
    setActive(index);
  };

  /** Page links: same-page clicks just close; "/" on the home page also returns to the top behind the curtain. */
  const onPageClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (href === pathname) {
      event.preventDefault();
      if (href === "/") {
        lockScroll(false);
        scrollToTarget(0, { immediate: true });
      }
      ui.setMenu(false);
    }
  };

  /** Chapter jumps: on the home page, cut to the chapter while the curtain still
   *  covers the screen; keyboard focus follows to the chapter when the menu closes. */
  const onChapterClick = (id: ChapterId) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isHome) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    jumpedRef.current = target;
    lockScroll(false);
    scrollToTarget(target, { immediate: true });
    ui.setMenu(false);
  };

  const preview = PAGES[active] ?? PAGES[0];

  return (
    <div
      aria-label="Site menu"
      aria-modal="true"
      className="menu"
      data-condensed={condensed ? "true" : "false"}
      data-open={open ? "true" : "false"}
      id={MENU_ID}
      inert={!open}
      ref={rootRef}
      role="dialog"
    >
      <div aria-hidden="true" className="menu-shutter" />
      <div className="menu-curtain">
        <div aria-hidden="true" className="menu-grain">
          <div className="plato-grain" />
        </div>
        <div className="menu-scroll" data-lenis-prevent="">
          <div className="menu-bar">
            <ChromeLink
              aria-label="Platō home"
              className="menu-logo menu-fade"
              href="/"
              onClick={onPageClick("/")}
              style={{ "--i": 0 } as CSSProperties}
            >
              <Wordmark className="menu-logo__mark" title="" />
            </ChromeLink>
            <button
              aria-label="Close menu"
              className="menu-close"
              onClick={() => ui.setMenu(false)}
              type="button"
            >
              <span aria-hidden="true" className="menu-close__label t-label">
                Close
              </span>
              <span className="menu-close__glyph">
                <BurgerLines open={open} />
              </span>
            </button>
          </div>

          {/* Small screens: the four chapters sit right under the bar (the foot's
              journey column takes over from 820px). */}
          <section
            aria-labelledby="menu-top-chapters"
            className="menu-top menu-fade"
            style={{ "--i": 1 } as CSSProperties}
          >
            <h2 className="menu-col__title t-label" id="menu-top-chapters">
              The journey
            </h2>
            <ChapterJumps onJump={onChapterClick} />
          </section>

          <div className="menu-body">
            <nav aria-label="Pages" className="menu-pages">
              <ol>
                {PAGES.map((page, i) => {
                  const current =
                    i === currentIndex &&
                    (page.href === pathname || pathname.startsWith(`${page.href}/`));
                  return (
                    <li key={page.href}>
                      <ChromeLink
                        aria-current={current ? "page" : undefined}
                        className="menu-link"
                        data-active={i === active ? "true" : "false"}
                        href={page.href}
                        onClick={onPageClick(page.href)}
                        onFocus={() => show(i)}
                        onPointerEnter={() => show(i)}
                        ref={i === 0 ? firstLinkRef : undefined}
                      >
                        <span aria-hidden="true" className="menu-link__num t-num">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="menu-link__mask">
                          <span className="menu-link__rise" style={{ "--i": i } as CSSProperties}>
                            <RollText>{page.label}</RollText>
                          </span>
                        </span>
                        <span aria-hidden="true" className="menu-link__caption">
                          {page.caption}
                        </span>
                      </ChromeLink>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <figure aria-hidden="true" className="menu-preview">
              <div className="menu-preview__frame">
                {PAGES.map((page, i) => (
                  <img
                    alt=""
                    className="menu-preview__img"
                    data-state={i === active ? "active" : i === prev ? "prev" : "idle"}
                    decoding="async"
                    height={1250}
                    key={page.href}
                    // Lazy where the preview is hidden (small screens never fetch it);
                    // eager once primed, so the photos are warm before the first open.
                    loading={menuPrimed ? "eager" : "lazy"}
                    src={menuPrimed || open ? page.image : undefined}
                    width={1000}
                  />
                ))}
              </div>
              <figcaption className="menu-preview__caption">
                <span className="menu-preview__num t-num">
                  {String(active + 1).padStart(2, "0")}
                </span>
                <span className="menu-preview__mask">
                  <span className="menu-preview__txt" key={active}>
                    {preview.caption}
                  </span>
                </span>
              </figcaption>
            </figure>
          </div>

          <div className="menu-foot">
            <section
              aria-labelledby="menu-foot-chapters"
              className="menu-col menu-col--chapters menu-fade"
              style={{ "--i": 1 } as CSSProperties}
            >
              <h2 className="menu-col__title t-label" id="menu-foot-chapters">
                The journey
              </h2>
              <ChapterJumps onJump={onChapterClick} />
            </section>

            <LinkColumn i={2} id="menu-foot-work" items={WORK_WITH_US} title="Work with us" />
            <LinkColumn i={3} id="menu-foot-visit" items={VISIT} title="Visit" />

            <section
              aria-labelledby="menu-foot-contact"
              className="menu-col menu-fade"
              style={{ "--i": 4 } as CSSProperties}
            >
              <h2 className="menu-col__title t-label" id="menu-foot-contact">
                Contact
              </h2>
              <ul className="menu-list">
                <li>
                  <ChromeLink className="menu-list__link" href={`mailto:${CONTACT.email}`}>
                    {CONTACT.email}
                  </ChromeLink>
                </li>
                <li>
                  <ChromeLink className="menu-list__link" href={CONTACT.whatsapp}>
                    WhatsApp us
                  </ChromeLink>
                </li>
                {CONTACT.hours.map((h) => (
                  <li className="menu-list__note" key={h}>
                    {h}
                  </li>
                ))}
              </ul>
            </section>

            <LinkColumn i={5} id="menu-foot-social" items={SOCIALS} title="Follow" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The four chapters as jump links (rendered once per layout; the other copy is display: none). */
function ChapterJumps({
  onJump,
}: {
  onJump: (id: ChapterId) => (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <ul className="menu-jumps">
      {CHAPTERS.map((c) => (
        <li key={c.id}>
          <ChromeLink className="menu-jump" href={`/#${c.id}`} onClick={onJump(c.id)}>
            <span aria-hidden="true" className="menu-jump__num t-num">
              {c.number}
            </span>
            <span className="menu-jump__label">{c.title}</span>
            <ArrowDownRightIcon className="menu-jump__arrow" />
          </ChromeLink>
        </li>
      ))}
    </ul>
  );
}

function LinkColumn({
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
    <section
      aria-labelledby={id}
      className="menu-col menu-fade"
      style={{ "--i": i } as CSSProperties}
    >
      <h2 className="menu-col__title t-label" id={id}>
        {title}
      </h2>
      <ul className="menu-list">
        {items.map((item) => (
          <li key={item.href}>
            <ChromeLink className="menu-list__link" external={item.external} href={item.href}>
              {item.label}
            </ChromeLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
