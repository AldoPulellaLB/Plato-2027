// SiteHeader: wordmark, the four chapters, account, cart and the burger, plus a
// hairline progress line along the top edge. Colours come from the story theme
// vars, so the whole bar flips with the pour (dark to white) and the menu (forest).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";

import { RollText } from "@/components/site/text/reveal";
import { Wordmark } from "@/components/site/wordmark";
import { useStory } from "@/experience/story";
import { getSessionSummary } from "@/lib/api/account.functions";
import { cart, cartCount, useCart } from "@/lib/cart";
import { ensureGsap, prefersReducedMotion, scrollToTarget } from "@/lib/motion/smooth";
import { CHAPTERS } from "@/lib/site";
import type { ChapterId } from "@/lib/site";
import { ui, useUi } from "@/lib/ui";

import { BurgerLines } from "./burger";
import { BagIcon, UserIcon } from "./icons";
import { ChromeLink } from "./link";
import { FOOTER_ID, MENU_ID, chrome, useChrome, usePathname } from "./shared";
import "./header.css";

const CONDENSE_AT = 80;

function supportsScrollTimeline() {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("animation-timeline: scroll()")
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { chapter } = useStory();
  const { menuOpen, ready } = useUi();
  const { condensed } = useChrome();

  const [tone, setTone] = useState<"theme" | "forest">("theme");
  const [pastStory, setPastStory] = useState(false);
  const [intro, setIntro] = useState<"none" | "idle" | "play" | "done">("none");
  const [firstName, setFirstName] = useState<string | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  const active: ChapterId | null = isHome && !pastStory ? chapter : null;
  const activeSpec = CHAPTERS.find((c) => c.id === active) ?? null;

  /* Intro: on the first load the header waits behind the preloader, then drops in. */
  useEffect(() => {
    if (prefersReducedMotion() || ui.get().ready) return;
    setIntro("idle");
  }, []);
  useEffect(() => {
    if (ready) setIntro((s) => (s === "idle" ? "play" : s));
  }, [ready]);
  useEffect(() => {
    if (intro !== "play") return;
    const id = window.setTimeout(() => setIntro("done"), 2200);
    return () => window.clearTimeout(id);
  }, [intro]);

  /* Signed-in state for the profile button (re-checked per page, since signing
     in or out happens on /account). Never throws; no database means signed out. */
  useEffect(() => {
    let live = true;
    getSessionSummary()
      .then((s) => {
        if (live) setFirstName(s.signedIn ? (s.firstName ?? "") : null);
      })
      .catch(() => {
        if (live) setFirstName(null);
      });
    return () => {
      live = false;
    };
  }, [pathname]);

  /* Condense after 80px, and switch to the forest tone while the footer sits under the bar. */
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      chrome.setCondensed(window.scrollY > CONDENSE_AT);
      const footer = document.getElementById(FOOTER_ID);
      const overFooter = !!footer && footer.getBoundingClientRect().top < 38;
      setTone(overFooter ? "forest" : "theme");
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  /* Progress line: story progress on the home page, page progress elsewhere. */
  useEffect(() => {
    const bar = progressRef.current;
    const fill = fillRef.current;
    if (!bar || !fill) return;
    const { ScrollTrigger } = ensureGsap();
    const setFill = (p: number) => {
      fill.style.transform = `scaleX(${Math.min(1, Math.max(0, p)).toFixed(4)})`;
    };
    let trigger: ReturnType<typeof ScrollTrigger.create> | null = null;
    let retry = 0;
    let tries = 0;
    let past = false;

    const setupStory = (story: HTMLElement) => {
      bar.dataset.mode = "story";
      fill.style.animation = "";
      const ticks = Array.from(bar.querySelectorAll<HTMLElement>("[data-tick]"));
      const placeTicks = (start: number, end: number) => {
        const range = end - start;
        for (const tick of ticks) {
          const target = document.getElementById(tick.dataset.tick ?? "");
          if (!target || range <= 0) {
            tick.style.opacity = "0";
            continue;
          }
          const top = target.getBoundingClientRect().top + window.scrollY;
          tick.style.left = `${(Math.min(1, Math.max(0, (top - start) / range)) * 100).toFixed(3)}%`;
          tick.style.opacity = "";
        }
      };
      trigger = ScrollTrigger.create({
        trigger: story,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          setFill(self.progress);
          const nowPast = self.progress >= 0.999;
          if (nowPast !== past) {
            past = nowPast;
            setPastStory(nowPast);
          }
        },
        onRefresh: (self) => {
          setFill(self.progress);
          placeTicks(self.start, self.end);
        },
      });
      setFill(trigger.progress);
      placeTicks(trigger.start, trigger.end);
      past = trigger.progress >= 0.999;
      setPastStory(past);
    };

    const setupPage = () => {
      setPastStory(false);
      if (supportsScrollTimeline()) {
        // CSS scroll-driven animation draws the line (brief: scroll-driven CSS behind a feature check).
        bar.dataset.mode = "css";
        fill.style.transform = "";
        return;
      }
      bar.dataset.mode = "page";
      trigger = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => setFill(self.progress),
        onRefresh: (self) => setFill(self.progress),
      });
      setFill(trigger.progress);
    };

    const attempt = () => {
      const story = isHome ? document.getElementById("story") : null;
      if (story && story.offsetHeight > window.innerHeight) {
        trigger?.kill();
        trigger = null;
        setupStory(story);
        return;
      }
      // Page progress meanwhile; the story may still be mounting its frames.
      if (!trigger && bar.dataset.mode !== "css") setupPage();
      if (isHome && tries < 6) {
        tries += 1;
        retry = window.setTimeout(attempt, 450);
      }
    };
    attempt();

    return () => {
      window.clearTimeout(retry);
      trigger?.kill();
      fill.style.transform = "";
    };
  }, [isHome]);

  const onChapterClick = (id: ChapterId) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isHome) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    scrollToTarget(target);
  };

  const onLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isHome) return;
    event.preventDefault();
    scrollToTarget(0, { duration: 2 });
  };

  return (
    <header
      className="hdr"
      data-condensed={condensed ? "true" : "false"}
      data-intro={intro}
      data-menu={menuOpen ? "open" : "closed"}
      data-tone={tone}
    >
      <div aria-hidden="true" className="hdr-scrim" />
      <div aria-hidden="true" className="hdr-progress" data-mode="story" ref={progressRef}>
        <span className="hdr-progress__fill" ref={fillRef} />
        {isHome
          ? CHAPTERS.slice(1).map((c) => (
              <span
                className="hdr-progress__tick"
                data-tick={c.id}
                key={c.id}
                style={{ opacity: 0 }}
              />
            ))
          : null}
      </div>

      <div className="hdr-inner">
        <div className="hdr-left">
          <ChromeLink aria-label="Platō home" className="hdr-logo" href="/" onClick={onLogoClick}>
            <Wordmark className="hdr-logo__mark" letterClassName="hdr-logo__letter" title="" />
          </ChromeLink>
          {isHome ? (
            <span
              aria-hidden="true"
              className="hdr-current"
              data-show={activeSpec ? "true" : "false"}
            >
              {activeSpec ? (
                <span className="hdr-current__txt" key={activeSpec.id}>
                  <span className="hdr-current__num t-num">{activeSpec.number}</span>
                  {activeSpec.label}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        <nav aria-label="Chapters" className="hdr-chapters">
          <ol>
            {CHAPTERS.map((c, i) => {
              const isActive = active === c.id;
              return (
                <li className="hdr-intro" key={c.id} style={{ "--i": i + 1 } as CSSProperties}>
                  <ChromeLink
                    aria-current={isActive ? "true" : undefined}
                    className="hdr-ch"
                    data-active={isActive ? "true" : "false"}
                    href={`/#${c.id}`}
                    onClick={onChapterClick(c.id)}
                  >
                    <span aria-hidden="true" className="hdr-ch__num t-num">
                      {c.number}
                    </span>
                    <span className="hdr-ch__name">
                      <span aria-hidden="true" className="hdr-ch__macron" />
                      <RollText>{c.label}</RollText>
                    </span>
                    <span aria-hidden="true" className="hdr-ch__line" />
                  </ChromeLink>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="hdr-actions">
          <ChromeLink
            aria-label={
              firstName === null ? "Account, sign in" : firstName ? `Account, signed in as ${firstName}` : "Account, signed in"
            }
            className="hdr-icon hdr-account hdr-intro"
            data-signed-in={firstName === null ? "false" : "true"}
            href="/account"
            style={{ "--i": 5 } as CSSProperties}
          >
            <UserIcon className="hdr-icon__svg" />
            <span aria-hidden="true" className="hdr-account__dot" />
          </ChromeLink>
          <CartTrigger />
          <BurgerToggle open={menuOpen} />
        </div>
      </div>
    </header>
  );
}

/** Bag with a live count that bumps whenever something lands in the cart. */
function CartTrigger() {
  const state = useCart();
  const count = cartCount(state);
  const bumped = state.bump > 0;
  const label = count === 0 ? "Cart, empty" : `Cart, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <button
      aria-controls="cart-drawer"
      aria-expanded={state.open}
      aria-haspopup="dialog"
      aria-label={label}
      className="hdr-icon hdr-cart hdr-intro"
      data-has={count > 0 ? "true" : "false"}
      onClick={() => cart.open()}
      style={{ "--i": 6 } as CSSProperties}
      type="button"
    >
      <span
        className="hdr-cart__bag"
        data-bump={bumped ? "true" : "false"}
        key={`bag-${state.bump}`}
      >
        <BagIcon className="hdr-icon__svg" />
      </span>
      <span
        aria-hidden="true"
        className="hdr-cart__count t-num"
        data-bump={bumped ? "true" : "false"}
        key={`n-${state.bump}`}
      >
        {count > 99 ? "99" : count}
      </span>
    </button>
  );
}

/** Two hairlines that morph into a cross; opens the full-screen menu. */
function BurgerToggle({ open }: { open: boolean }) {
  return (
    <button
      aria-controls={MENU_ID}
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
      className="hdr-icon hdr-burger hdr-intro"
      onClick={() => ui.toggleMenu()}
      onFocus={() => chrome.primeMenu()}
      onPointerEnter={() => chrome.primeMenu()}
      style={{ "--i": 7 } as CSSProperties}
      type="button"
    >
      <BurgerLines open={open} />
    </button>
  );
}
