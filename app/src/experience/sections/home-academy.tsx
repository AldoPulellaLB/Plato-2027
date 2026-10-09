// The Academy: a stacked index list of the five public courses. Each row is a
// CourseBook link (row-wide hover, the arrow travels right). On desktop a photo
// of the hovered course follows the cursor; touch screens get row thumbnails.
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline, SplitReveal } from "@/components/site/text/reveal";
import { liveVariants, productByHandle } from "@/lib/catalog";
import type { Product, Variant } from "@/lib/catalog";
import { prefersReducedMotion } from "@/lib/motion/smooth";
import { CONTACT } from "@/lib/site";

import { hasFinePointer, pad2, rand, useInView, usePaperTheme } from "./shared";
import "./home-academy.css";

/** Public courses, from the first cup at home to the café bar. */
const COURSE_HANDLES = [
  "home-brewing-filter",
  "home-brewing-filter-copy",
  "sensory-evaluation-and-tasting",
  "barista-basics",
  "becoming-a-cafe-barista",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "13 October 2026 | 09:00 - 11:30" → date, time window and duration. */
function parseSession(variant: Variant) {
  const [datePart = "", timePart = ""] = variant.title.split("|").map((s) => s.trim());
  const times = timePart.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  const range = datePart.match(/^(\d{1,2})-(\d{1,2})\s+([A-Za-z]+)/);
  const days = range ? Number(range[2]) - Number(range[1]) + 1 : 1;

  let window = "";
  let minutes = 0;
  if (times) {
    window = `${times[1]}:${times[2]} to ${times[3]}:${times[4]}`;
    minutes = Number(times[3]) * 60 + Number(times[4]) - (Number(times[1]) * 60 + Number(times[2]));
  }
  const hours = minutes / 60;
  const hoursLabel =
    minutes > 0 ? `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours` : "";
  const duration = days > 1 ? `${days} days` : hoursLabel;

  let date = datePart;
  if (variant.date) {
    const d = new Date(`${variant.date}T00:00:00Z`);
    const day = d.getUTCDate();
    const month = MONTHS[d.getUTCMonth()];
    date = range ? `${range[1]} to ${range[2]} ${month}` : `${DAYS[d.getUTCDay()]} ${day} ${month}`;
  }
  return { date, window, duration };
}

interface Course {
  product: Product;
  title: string;
  flavour: string | null;
  next: { date: string; window: string } | null;
  duration: string;
  price: string;
  image: string;
}

function buildCourses(): Course[] {
  return COURSE_HANDLES.flatMap((handle) => {
    const product = productByHandle(handle);
    if (!product) return [];
    const live = [...liveVariants(product)].sort((a, b) =>
      (a.date ?? "").localeCompare(b.date ?? ""),
    );
    const nextVariant = live[0];
    const reference = nextVariant ?? product.variants[product.variants.length - 1];
    const session = reference ? parseSession(reference) : null;
    const flavourMatch = product.title.match(/^(.*?)\s*\((.+)\)$/);
    return [
      {
        product,
        title: flavourMatch ? flavourMatch[1] : product.title,
        flavour: flavourMatch ? flavourMatch[2] : null,
        next: nextVariant && session ? { date: session.date, window: session.window } : null,
        duration: session?.duration ?? "",
        price: rand(Math.min(...(live.length ? live : product.variants).map((v) => v.price))),
        image: product.images[0],
      },
    ];
  });
}

export function HomeAcademy() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  // Dates depend on "today", so compute them per render, not at module load.
  const courses = buildCourses();
  const [hovered, setHovered] = useState<number | null>(null);
  const [cursorOn, setCursorOn] = useState(false);

  usePaperTheme(sectionRef);
  useInView(listRef);

  // Cursor-following image (fine pointers only, never under reduced motion).
  useEffect(() => {
    const wrap = wrapRef.current;
    const cursor = cursorRef.current;
    if (!wrap || !cursor || !hasFinePointer() || prefersReducedMotion()) return;
    setCursorOn(true);

    let raf = 0;
    let inside = false;
    let clientX = 0;
    let clientY = 0;
    let x = 0;
    let y = 0;
    let rot = 0;
    let primed = false;

    const frame = () => {
      const rect = wrap.getBoundingClientRect();
      const tx = clientX - rect.left;
      const ty = clientY - rect.top;
      if (!primed) {
        x = tx;
        y = ty;
        primed = true;
      }
      const dx = tx - x;
      x += dx * 0.14;
      y += (ty - y) * 0.14;
      rot += (Math.max(-9, Math.min(9, dx * 0.06)) - rot) * 0.12;
      cursor.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      if (inside || Math.abs(dx) > 0.5) raf = requestAnimationFrame(frame);
      else raf = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      clientX = e.clientX;
      clientY = e.clientY;
      kick();
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      inside = true;
      primed = false;
      cursor.dataset.inside = "true";
      clientX = e.clientX;
      clientY = e.clientY;
      kick();
    };
    const onLeave = () => {
      inside = false;
      cursor.dataset.inside = "false";
      setHovered(null);
    };
    // Keep the image under a still cursor while the page scrolls.
    const onScroll = () => {
      if (inside) kick();
    };

    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (courses.length === 0) return null;

  return (
    <section aria-labelledby="hacad-title" className="hacad" id="home-academy" ref={sectionRef}>
      <header className="hacad-head">
        <GhostHeadline as="h2" className="hacad-title" id="hacad-title">
          The Academy
        </GhostHeadline>
        <div className="hacad-intro">
          <SplitReveal className="hacad-lede t-body" delay={160} stagger={18}>
            Five public courses, from Home Brewing to Training the Café Barista, taught hands-on at
            the Platō Academy. We also host corporate team experiences, and the space is available
            for venue hire.
          </SplitReveal>
          <p className="hacad-contact">
            <span className="t-label hacad-contact__k">Teams and venue hire</span>
            <a className="hacad-contact__mail" href={`mailto:${CONTACT.academyEmail}`}>
              {CONTACT.academyEmail}
            </a>
          </p>
        </div>
      </header>

      <div className="hacad-listwrap" data-cursor={cursorOn ? "on" : undefined} ref={wrapRef}>
        <div aria-hidden="true" className="hacad-cols t-label">
          <span>No.</span>
          <span>Course</span>
          <span>Next date</span>
          <span>Duration</span>
          <span className="hacad-cols__price">Price</span>
        </div>

        <ol aria-label="Academy courses" className="hacad-list" ref={listRef}>
          {courses.map((course, i) => (
            <li
              className="hacad-item"
              data-hovered={hovered === i ? "true" : undefined}
              key={course.product.handle}
              style={{ "--i": i } as CSSProperties}
            >
              <Link
                className="hacad-row"
                onBlur={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setHovered(i);
                }}
                params={{ handle: course.product.handle }}
                to="/shop/$handle"
              >
                <span aria-hidden="true" className="hacad-row__fill" />
                <span aria-hidden="true" className="hacad-row__no t-num">
                  {pad2(i + 1)}
                </span>
                <span aria-hidden="true" className="hacad-row__thumb">
                  <img
                    alt=""
                    decoding="async"
                    height={160}
                    loading="lazy"
                    src={course.image}
                    width={128}
                  />
                </span>
                <h3 className="hacad-row__title">
                  <span className="hacad-row__name">{course.title}</span>
                  {course.flavour ? (
                    <span className="hacad-row__flavour"> {course.flavour}</span>
                  ) : null}
                </h3>
                <span className="hacad-row__date">
                  <span className="hacad-row__k t-label">Next date </span>
                  {course.next ? (
                    <>
                      <span className="hacad-row__v t-num">{course.next.date}</span>
                      <span className="hacad-row__sub t-num"> {course.next.window}</span>
                    </>
                  ) : (
                    <span className="hacad-row__v hacad-row__v--soon">New dates soon</span>
                  )}
                </span>
                <span className="hacad-row__dur">
                  <span className="hacad-row__k t-label">Duration </span>
                  <span className="hacad-row__v">{course.duration}</span>
                </span>
                <span className="hacad-row__price t-num">
                  <span className="hacad-row__k t-label">Price </span>
                  <span className="hacad-row__v">{course.price}</span>
                </span>
                <span aria-hidden="true" className="hacad-row__go">
                  <span className="hacad-row__shaft" />
                  <svg
                    className="hacad-row__head"
                    fill="none"
                    height="14"
                    viewBox="0 0 8 14"
                    width="8"
                  >
                    <path
                      d="M1 1l6 6-6 6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <div
          aria-hidden="true"
          className="hacad-cursor"
          data-visible={cursorOn && hovered !== null ? "true" : "false"}
          ref={cursorRef}
        >
          <div className="hacad-cursor__frame">
            {courses.map((course, i) => (
              <img
                alt=""
                className="hacad-cursor__img"
                data-active={hovered === i ? "true" : "false"}
                decoding="async"
                key={course.product.handle}
                loading="lazy"
                src={course.image}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hacad-foot">
        <Link className="hacad-more" to="/academy">
          <span className="hacad-more__text">Visit the Academy</span>
          <span aria-hidden="true" className="hacad-more__disc">
            <svg fill="none" height="16" viewBox="0 0 22 16" width="22">
              <path
                d="M1 8h19M13.5 1.5 20 8l-6.5 6.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </span>
        </Link>
      </div>
    </section>
  );
}
