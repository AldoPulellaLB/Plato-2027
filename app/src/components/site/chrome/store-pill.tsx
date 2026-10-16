// StoreFinderPill: a small bottom-right pill so a ready visitor never has to
// finish the story to find a store. It belongs to the story's middle stretch:
// it rises from the community frame (f09) on, never during the pour, and steps
// away wherever the page already offers its own primary CTA (f12's bag, f14's
// "Find your Platō", the sections after the story), for the footer, the menu and
// the bag drawer. It shrinks to a pin on small screens.
import { RollText } from "@/components/site/text/reveal";
import { useStory } from "@/experience/story";
import { useCart } from "@/lib/cart";
import { useUi } from "@/lib/ui";

import { PinIcon } from "./icons";
import { ChromeLink } from "./link";
import { frameIndex, useChrome, useFooterInView, usePathname } from "./shared";
import "./store-pill.css";

const COMMUNITY_INDEX = frameIndex("f09");

/** Whether the pill is up (also read by BackToTop, which sits above it). */
export function useStorePillVisible() {
  const pathname = usePathname();
  const { frame } = useStory();
  const { menuOpen } = useUi();
  const { open: cartOpen } = useCart();
  const { storyOnScreen } = useChrome();
  const footerInView = useFooterInView(160);

  const isHome = pathname === "/";
  return (
    isHome &&
    storyOnScreen &&
    frameIndex(frame) >= COMMUNITY_INDEX &&
    frame !== "f12" &&
    frame !== "f14" &&
    !footerInView &&
    !menuOpen &&
    !cartOpen
  );
}

export function StoreFinderPill() {
  const visible = useStorePillVisible();

  return (
    <ChromeLink
      aria-hidden={visible ? undefined : true}
      aria-label="Find a store"
      className="sfp"
      data-visible={visible ? "true" : "false"}
      href="/stores"
      tabIndex={visible ? undefined : -1}
    >
      <span aria-hidden="true" className="sfp-pin">
        <PinIcon className="sfp-pin__svg" />
        <span className="sfp-pin__ring" />
      </span>
      <span aria-hidden="true" className="sfp-label">
        <RollText>Find a store</RollText>
      </span>
    </ChromeLink>
  );
}
