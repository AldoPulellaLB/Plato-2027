/**
 * Scene data for the scroll-scrub film in chapter two (frames 06, 07, 08).
 * Three legs cut from two continuous takes:
 *   f06 "pour-hq-shot"  frames 0-159 of The Pour (ristretto into the Platō takeaway cup)
 *   f07 "pour-hq-milk"  frames 160-360 of The Pour (milk, latte art in the cup, white-out)
 *   f08 "counter-cup" The Counter (hands slide the cup across, then turn it to its blank
 *       back, where the site writes a customer's note: chapters/pour/cup-note.tsx)
 * The Pour is rendered at 1080p from the client's opening frame, upscaled to 2560x1440,
 * then encoded at 1440p for desktop and 1080p for phones.
 * The Counter is the original 1080p take with only the cup swapped for the branded
 * lidless sage cup (Kling 3.0 Omni Edit, 4k), graded back to the source, same encodes.
 * Its first 56 frames (the push) are followed by a Kling 3.0 4k take from that frame to
 * the cup turned round (end frame: GPT Image 2.5), graded to match, plus a 30-frame hold.
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
    clip: "/assets/world/pour-hq-shot.mp4",
    poster: "/assets/world/pour-hq-shot-poster.webp",
    mobileClip: "/assets/world/pour-hq-shot-mobile.mp4",
    mobilePoster: "/assets/world/pour-hq-shot-mobile-poster.webp",
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
    clip: "/assets/world/pour-hq-milk.mp4",
    poster: "/assets/world/pour-hq-milk-poster.webp",
    mobileClip: "/assets/world/pour-hq-milk-mobile.mp4",
    mobilePoster: "/assets/world/pour-hq-milk-mobile-poster.webp",
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
    clip: "/assets/world/counter-cup.mp4",
    poster: "/assets/world/counter-cup-poster.webp",
    mobileClip: "/assets/world/counter-cup-mobile.mp4",
    mobilePoster: "/assets/world/counter-cup-mobile-poster.webp",
    // 2.5 screens at the old pace (about 160 frames a screen): the clip plays over the
    // first 57.5% while the stage is pinned, and its last frame (the note written on the
    // cup) holds while the stage scrolls away.
    scroll: 2.5,
    hold: 0.425,
    align: "right",
    // --ch-f08-x (scroll-scrub.css) shifts the picture left on narrower screens so the cup clears the copy.
    objectPosition: "var(--ch-f08-x, 35%) 50%",
    mobileObjectPosition: "40% 50%",
  },
];
