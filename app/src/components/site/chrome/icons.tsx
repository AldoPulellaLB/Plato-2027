// Hand-drawn chrome glyphs on a 24px grid, stroke 1.5 (matches lucide's weight).
// Parts carry class names so each control can animate its own piece.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export function BagIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path className="icon-bag__handle" d="M8.75 9.25V7.5a3.25 3.25 0 0 1 6.5 0v1.75" />
      <path d="M5 8.75h14l-1.05 10.6a1.6 1.6 0 0 1-1.6 1.45H7.65a1.6 1.6 0 0 1-1.6-1.45L5 8.75Z" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle className="icon-user__head" cx="12" cy="8.25" r="3.6" />
      <path d="M4.9 20.25c.95-3.55 3.85-5.6 7.1-5.6s6.15 2.05 7.1 5.6" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21.1s-6.4-5.55-6.4-11.05a6.4 6.4 0 0 1 12.8 0c0 5.5-6.4 11.05-6.4 11.05Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12h14.5M13.25 6.25 19 12l-5.75 5.75" />
    </svg>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 17 17 7M8.75 7H17v8.25" />
    </svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 19.5V5M6.25 10.75 12 5l5.75 5.75" />
    </svg>
  );
}

export function ArrowDownRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 7l10 10M17 8.75V17H8.75" />
    </svg>
  );
}
