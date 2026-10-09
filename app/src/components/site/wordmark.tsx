// The real PLATŌ wordmark (plato.coffee PLATO_PRIMARY_GREEN_RGB_V3.svg), one
// <g> per letter so the footer and loader can animate letters individually.
// Never retype or redraw the logo; always use this component.
import type { SVGProps } from "react";

export const WORDMARK_VIEWBOX = "0 0 1492.68 356.85";

export const WORDMARK_LETTERS = [
  {
    key: "P",
    d: [
      "M0,95.91h89.76c16.28,0,30.4,1.97,42.35,5.89,11.96,3.93,21.86,9.43,29.72,16.5,7.86,7.07,13.73,15.58,17.6,25.51,3.87,9.94,5.81,20.91,5.81,32.93s-1.94,22.79-5.81,32.67c-3.87,9.88-9.74,18.36-17.6,25.43-7.86,7.07-17.76,12.58-29.72,16.5-11.96,3.93-26.08,5.9-42.35,5.9h-42.94v92.62H0V95.91ZM88.08,212.78c15.72,0,27.53-2.83,35.45-8.5,7.92-5.67,11.87-14.9,11.87-27.7s-3.96-22.03-11.87-27.7c-7.92-5.67-19.73-8.5-35.45-8.5h-41.26v72.42h41.26Z",
    ],
  },
  { key: "L", d: ["M309.47,95.74h46.65v209.5h120.88v44.63h-167.53V95.74Z"] },
  {
    key: "A",
    d: [
      "M704.24,78.05l128.5,271.82h-51.37l-23.58-52.55h-107.11l-23.58,52.55h-51.37l128.5-271.82ZM738.05,252.86l-33.81-74.89-33.8,74.89h67.61Z",
    ],
  },
  { key: "T", d: ["M988.55,140.37h-89.26v-44.46h225.33v44.46h-89.26v209.5h-46.81v-209.5Z"] },
  {
    key: "Ō",
    d: [
      "M1361.86,92.2c-72.15,0-130.84,58.7-130.84,130.86s58.69,130.86,130.84,130.86,130.82-58.7,130.82-130.86-58.69-130.86-130.82-130.86ZM1361.64,307c-45.65,0-82.88-37.66-82.88-83.94v-.02c0-46.28,37.23-83.94,82.88-83.94s82.87,37.68,82.87,83.96-37.03,83.94-82.87,83.94Z",
      "M1279.18,2.94h165.33v44.63h-165.33V2.94Z",
    ],
  },
] as const;

interface WordmarkProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Accessible name. Pass "" to hide from assistive tech (decorative use). */
  title?: string;
  letterClassName?: string;
}

export function Wordmark({ title = "Platō", letterClassName, ...rest }: WordmarkProps) {
  const decorative = title === "";
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      {...rest}
    >
      {WORDMARK_LETTERS.map((letter) => (
        <g className={letterClassName} data-letter={letter.key} key={letter.key}>
          {letter.d.map((d) => (
            <path d={d} key={d.slice(0, 16)} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** The ō symbol on its own (favicon, badges, loader). */
export function PlatoSymbol({ title = "Platō", ...rest }: Omit<SVGProps<SVGSVGElement>, "children"> & { title?: string }) {
  const decorative = title === "";
  const o = WORDMARK_LETTERS[4];
  return (
    <svg
      viewBox="1225 0 274 360"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      {...rest}
    >
      {o.d.map((d) => (
        <path d={d} key={d.slice(0, 16)} />
      ))}
    </svg>
  );
}
