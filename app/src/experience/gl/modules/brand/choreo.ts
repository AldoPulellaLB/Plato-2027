// Frame 10 scroll choreography as pure functions (no three.js), so the DOM size
// labels can move in lockstep with the WebGL cups if they want to.
//
// `scrolled` is how far the page has scrolled past the start of the pin, in
// viewport heights (= -sectionTop / innerHeight); `pinLength` is the section
// height in viewport heights minus one (0.5 for the 150vh frame).
import { easeInOutCubic, range, smoother } from "./math";

/** How far the cup row travels left on exit, in viewport widths at the cups' base line. */
export const CUP_ROW_SLIDE_VW = 1.08;

/** 0..1: the row turning from "looking away" to facing the viewer. */
export function cupRowLook(scrolled: number, pinLength: number) {
  return smoother(range(scrolled, -0.1, pinLength * 0.8));
}

/** 0..1: the exit slide to the left (multiply by CUP_ROW_SLIDE_VW for the distance). */
export function cupRowSlide(scrolled: number, pinLength: number) {
  return easeInOutCubic(range(scrolled, pinLength * 0.8, pinLength + 1));
}
