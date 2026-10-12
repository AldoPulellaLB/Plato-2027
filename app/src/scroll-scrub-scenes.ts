/**
 * Scene data for the scroll-scrub film in chapter two (frames 06, 07, 08).
 * Three legs cut from two continuous takes:
 *   f06 "pour-cup-shot"  frames 0-163 of The Pour (ristretto into the Platō takeaway cup)
 *   f07 "pour-cup-milk"  frames 164-360 of The Pour (milk, latte art in the cup, white-out)
 *   f08 "counter"    The Counter (hands slide the cup across, pull back to the cafe)
 * f06 -> f07 is frame-exact (consecutive frames). f07 ends on white foam; the page's
 * white mask and theme flip carry the seam into f08, which opens high-key white.
 *
 * Keep this array a module constant: changing its identity rebuilds the controller.
 */
import type { ScrollScrubScene, ScrollScrubTheme } from "@/components/scroll-scrub/scroll-scrub";

/** The film follows the live story theme (roast until the pour, paper after). */
export const scrollScrubTheme: ScrollScrubTheme = {
  accent: "var(--accent)",
  background: "var(--bg)",
  ink: "var(--fg)",
  muted: "var(--fg-muted)",
};

export const scrollScrubScenes: ScrollScrubScene[] = [
  {
    id: "f06",
    label: "The shot",
    title: "Three ristretto shots. Every time.",
    body: "Our signature drinks are built on ristretto: the short, dense first part of the shot. Aristotle and Platō both start with three.",
    tags: ["Ristretto", "100% Arabica"],
    clip: "/assets/world/pour-cup-shot.mp4",
    poster: "/assets/world/pour-cup-shot-poster.webp",
    mobileClip: "/assets/world/pour-cup-shot-mobile.mp4",
    mobilePoster: "/assets/world/pour-cup-shot-mobile-poster.webp",
    // Desktop: shift the frame right so the cup clears the copy column; both pour legs
    // share it so the f06 to f07 seam stays frame-exact. Phones stay centred.
    objectPosition: "8% 50%",
    mobileObjectPosition: "50% 50%",
    scroll: 2,
    align: "left",
  },
  {
    id: "f07",
    label: "The pour",
    title: "Then it’s handed over.",
    // No words during the pour: the line appears in ink once the white covers the frame.
    body: "",
    clip: "/assets/world/pour-cup-milk.mp4",
    poster: "/assets/world/pour-cup-milk-poster.webp",
    mobileClip: "/assets/world/pour-cup-milk-mobile.mp4",
    mobilePoster: "/assets/world/pour-cup-milk-mobile-poster.webp",
    // Desktop: shift the frame right so the cup clears the copy column; both pour legs
    // share it so the f06 to f07 seam stays frame-exact. Phones stay centred.
    objectPosition: "8% 50%",
    mobileObjectPosition: "50% 50%",
    scroll: 2,
    linger: 0.15,
    align: "right",
  },
  {
    id: "f08",
    label: "The counter",
    title: "They know your name. And your order.",
    body: "Regulars are the heart of every Platō. The people behind the counter remember how you take it, and love a chat while they make it.",
    clip: "/assets/world/counter.mp4",
    poster: "/assets/world/counter-poster.webp",
    mobileClip: "/assets/world/counter-mobile.mp4",
    mobilePoster: "/assets/world/counter-mobile-poster.webp",
    scroll: 1.5,
    align: "right",
    // --ch-f08-x (scroll-scrub.css) shifts the picture left on narrower screens so the cup clears the copy.
    objectPosition: "var(--ch-f08-x, 35%) 50%",
    mobileObjectPosition: "40% 50%",
  },
];
