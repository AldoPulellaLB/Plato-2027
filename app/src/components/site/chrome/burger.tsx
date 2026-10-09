// The two-line burger glyph that morphs into a cross. Shared by the header's
// BurgerToggle and the menu's own close control (same spot, same motion), so
// the morph reads as one continuous gesture across the curtain.
import "./burger.css";

export function BurgerLines({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="chr-burger" data-open={open ? "true" : "false"}>
      <span className="chr-burger__l chr-burger__l--1" />
      <span className="chr-burger__l chr-burger__l--2" />
    </span>
  );
}
