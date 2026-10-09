// StoreFinderPill: once the story reaches the counter (frame 08) a small pill
// rises in bottom-right so a ready visitor never has to finish the story to find
// a store. It stays for the rest of the visit, steps aside for the footer and
// shrinks to a pin on small screens.
import { useEffect, useState } from "react";

import { RollText } from "@/components/site/text/reveal";
import { useStory } from "@/experience/story";
import { useCart } from "@/lib/cart";
import { useUi } from "@/lib/ui";

import { PinIcon } from "./icons";
import { ChromeLink } from "./link";
import { frameIndex, useFooterInView, usePathname } from "./shared";
import "./store-pill.css";

const COUNTER_INDEX = frameIndex("f08");

export function StoreFinderPill() {
  const pathname = usePathname();
  const { frame } = useStory();
  const { menuOpen } = useUi();
  const { open: cartOpen } = useCart();
  const footerInView = useFooterInView(160);
  const [earned, setEarned] = useState(false);

  const isHome = pathname === "/";

  useEffect(() => {
    if (isHome && frameIndex(frame) >= COUNTER_INDEX) setEarned(true);
  }, [isHome, frame]);

  const visible = isHome && earned && !footerInView && !menuOpen && !cartOpen;

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
