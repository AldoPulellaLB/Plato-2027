/**
 * Scene data for the scroll-scrub film in chapter two (frames 06, 07, 08).
 * Three legs cut from two continuous takes:
 *   f06 "pour-shot"  frames 0-148 of The Pour (ristretto into the cup)
 *   f07 "pour-milk"  frames 149-360 of The Pour (milk, latte art, white-out)
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
    kicker: "Frame 06",
    title: "Three ristretto shots. Every time.",
    body: "Every signature drink is built on ristretto: the short, dense first pull of the shot. Aristotle, Platō and Socrates all start here.",
    tags: ["Ristretto", "100% Arabica"],
    clip: "/assets/world/pour-shot.mp4",
    poster: "/assets/world/pour-shot-poster.webp",
    mobileClip: "/assets/world/pour-shot-mobile.mp4",
    mobilePoster: "/assets/world/pour-shot-mobile-poster.webp",
    scroll: 2,
    align: "left",
  },
  {
    id: "f07",
    label: "The pour",
    kicker: "Frame 07",
    title: "Then it's handed over.",
    body: "Milk meets the shot, the art blooms, and the cup is ready for someone.",
    clip: "/assets/world/pour-milk.mp4",
    poster: "/assets/world/pour-milk-poster.webp",
    mobileClip: "/assets/world/pour-milk-mobile.mp4",
    mobilePoster: "/assets/world/pour-milk-mobile-poster.webp",
    scroll: 2,
    linger: 0.15,
    align: "right",
  },
  {
    id: "f08",
    label: "The counter",
    kicker: "Frame 08",
    title: "They know your name. And your order.",
    body: "Regulars are the heart of every Platō. The people behind the counter remember how you take it, and ask how your day is going.",
    clip: "/assets/world/counter.mp4",
    poster: "/assets/world/counter-poster.webp",
    mobileClip: "/assets/world/counter-mobile.mp4",
    mobilePoster: "/assets/world/counter-mobile-poster.webp",
    scroll: 1.5,
    align: "right",
    objectPosition: "35% 50%",
    mobileObjectPosition: "40% 50%",
  },
];
