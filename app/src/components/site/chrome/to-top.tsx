// BackToTop: a small round arrow in the bottom-right corner of the home page,
// once the visitor is a screen or more down. It sits just above the store pill
// whenever the pill is up, and steps aside for the footer (which has its own
// "back to top"), the menu and the bag drawer.
import { useEffect, useState } from "react";

import { useCart } from "@/lib/cart";
import { useUi } from "@/lib/ui";

import { ArrowUpIcon } from "./icons";
import { backToTop, useChrome, useFooterInView, usePathname } from "./shared";
import { useStorePillVisible } from "./store-pill";
import "./to-top.css";

/** Show once the page is this many viewport heights down. */
const SHOW_AFTER = 1;

function useScrolledPast(screens: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setPast(window.scrollY > screens * window.innerHeight);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [screens]);
  return past;
}

export function BackToTop() {
  const pathname = usePathname();
  const { menuOpen } = useUi();
  const { open: cartOpen } = useCart();
  const { inkTone } = useChrome();
  const footerInView = useFooterInView();
  const pillUp = useStorePillVisible();
  const scrolled = useScrolledPast(SHOW_AFTER);

  const visible = pathname === "/" && scrolled && !footerInView && !menuOpen && !cartOpen;

  return (
    <button
      aria-label="Back to top"
      className="totop"
      data-lift={pillUp ? "true" : "false"}
      data-tone={inkTone ? "ink" : "theme"}
      data-visible={visible ? "true" : "false"}
      inert={!visible}
      onClick={backToTop}
      tabIndex={visible ? undefined : -1}
      type="button"
    >
      <ArrowUpIcon aria-hidden="true" className="totop__arrow" />
    </button>
  );
}
