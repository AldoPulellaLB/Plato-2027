// /academy: The Academy by Platō. Courses with live dates, corporate team
// experiences, venue hire and a small gallery of the space. Namespace: ac-.
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { useMemo, useRef } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline, RevealMedia, RollText, SplitReveal } from "@/components/site/text/reveal";
import { PRODUCTS, liveVariants } from "@/lib/catalog";
import type { Product, Variant } from "@/lib/catalog";
import { CONTACT } from "@/lib/site";

import { DrawRule, PageLink, Rise, cleanCopy, firstSentences, formatHours, jumpTo, parseSession, rand, useHeroReveal, useParallax } from "./shared";
import "./academy.css";

/** Course photography (real Academy and product images). */
const COURSE_IMAGE: Record<string, { src: string; w: number; h: number; alt: string }> = {
  "barista-basics": { src: "/assets/products/barista-basics-1.jpg", w: 1200, h: 960, alt: "Espresso being pulled on a commercial machine at the Academy" },
  "home-brewing-filter-copy": { src: "/assets/academy/group-head.webp", w: 2000, h: 1600, alt: "An espresso shot pouring into a measuring glass on a scale" },
  "home-brewing-filter": { src: "/assets/academy/pour-over.webp", w: 768, h: 1024, alt: "A barista pouring a filter brew" },
  "sensory-evaluation-and-tasting": { src: "/assets/academy/cupping.webp", w: 768, h: 1024, alt: "Cups of coffee lined up for a cupping" },
  "becoming-a-cafe-barista": { src: "/assets/products/becoming-a-cafe-barista-1.jpg", w: 1200, h: 900, alt: "A barista training behind a white café bar" },
};

interface Session {
  variant: Variant;
  day: string;
  time: string;
  weekday: string;
}

interface Course {
  product: Product;
  number: string;
  summary: string;
  venue: string | null;
  duration: string;
  price: number;
  sessions: Session[];
}

const pad = (n: number) => String(n).padStart(2, "0");

function weekdays(iso: string, days: number) {
  const first = new Date(`${iso}T12:00:00Z`);
  const names = Array.from({ length: days }, (_, i) =>
    new Date(first.getTime() + i * 86_400_000).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }),
  );
  return names.join(" and ");
}

function buildCourses(): Course[] {
  return PRODUCTS.filter((p) => p.category === "academy").map((product, i) => {
    const raw = cleanCopy(product.description);
    const venueMatch = raw.match(/\bVenue\s+(.+)$/);
    const venue = venueMatch ? venueMatch[1].replace(/\bStr\b\.?/, "Street").trim() : null;
    const body = venueMatch ? raw.slice(0, venueMatch.index).trim() : raw;
    const live = liveVariants(product).slice().sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const reference = live[0] ?? product.variants[product.variants.length - 1];
    const refParsed = parseSession(reference.title, reference.date);
    const sessions = live.map((variant) => {
      const s = parseSession(variant.title, variant.date);
      return { variant, day: s.day, time: s.time, weekday: variant.date ? weekdays(variant.date, s.days) : "" };
    });
    return {
      product,
      number: pad(i + 1),
      summary: firstSentences(body, 3),
      venue,
      duration: formatHours(refParsed.hours, refParsed.days),
      price: reference.price,
      sessions,
    };
  });
}

export function AcademyPage() {
  const courses = useMemo(buildCourses, []);
  const root = useRef<HTMLElement>(null);
  useParallax(root);

  const next = useMemo(() => {
    let best: { course: Course; session: Session } | null = null;
    for (const course of courses) {
      const s = course.sessions[0];
      const key = (x: Session) => `${x.variant.date ?? ""} ${x.time}`;
      if (s && (!best || key(s) < key(best.session))) best = { course, session: s };
    }
    return best;
  }, [courses]);

  return (
    <main className="pg ac" id="main" ref={root}>
      <AcademyHero />
      <Intro courses={courses} />
      <section aria-labelledby="ac-courses-title" className="ac-courses pg-anchor" id="ac-courses" tabIndex={-1}>
        <div className="pg-wrap">
          <header className="ac-courses__head">
            <GhostHeadline className="ac-courses__title" id="ac-courses-title">
              The courses
            </GhostHeadline>
            {next ? (
              <Rise as="p" className="ac-next" delay={120}>
                <span className="ac-next__pulse" aria-hidden="true" />
                <span className="t-label">Next up</span>
                <span className="ac-next__what">
                  {next.course.product.title}, {next.session.weekday} {next.session.day}
                </span>
              </Rise>
            ) : null}
          </header>
          <ol className="ac-courses__list">
            {courses.map((course) => (
              <CourseSheet course={course} key={course.product.handle} />
            ))}
          </ol>
        </div>
      </section>
      <Teams />
      <Gallery />
    </main>
  );
}

/* ------------------------------------------------------------------ hero */

function AcademyHero() {
  const { play, stage } = useHeroReveal();
  return (
    <section aria-labelledby="ac-title" className="ac-hero" data-pg-hero={stage}>
      <div className="pg-wrap ac-hero__grid">
        <div className="ac-hero__meta pg-in">
          <span className="t-label">The Academy by Platō</span>
          <span className="t-label ac-hero__meta-end">Courses, teams and venue hire</span>
        </div>
        <h1 className="ac-hero__title" id="ac-title">
          <GhostHeadline as="span" className="ac-hero__l1" play={play} trigger="manual">
            Coffee,
          </GhostHeadline>
          <GhostHeadline as="span" className="ac-hero__l2" play={play} style={{ "--reveal-delay": "180ms" } as CSSProperties} trigger="manual">
            by hand.
          </GhostHeadline>
        </h1>

        <div className="ac-hero__big pg-frame pg-wipe" style={{ "--d": "220ms" } as CSSProperties}>
          <div className="pg-fill">
            <img
              alt="The group head of an espresso machine at the Academy"
              data-pg-speed="6"
              decoding="async"
              fetchPriority="high"
              height={1600}
              src="/assets/academy/group-head.webp"
              width={2000}
            />
          </div>
        </div>

        <div className="ac-hero__small-wrap" data-pg-speed="-14">
          <div className="ac-hero__small pg-frame pg-wipe" data-from="left" style={{ "--d": "520ms" } as CSSProperties}>
            <div className="pg-fill">
              <img alt="A cupping spoon resting over a cup of coffee" decoding="async" height={600} src="/assets/academy/spoon.webp" width={450} />
            </div>
          </div>
        </div>

        <div className="ac-hero__intro">
          <p className="ac-hero__lede pg-in" style={{ "--d": "620ms" } as CSSProperties}>
            Hands-on courses for every level, from home brewing to training as a café barista.
          </p>
          <a
            className="ac-hero__cta pg-in"
            href="#ac-courses"
            onClick={(e) => {
              e.preventDefault();
              jumpTo("ac-courses");
            }}
            style={{ "--d": "740ms" } as CSSProperties}
          >
            <RollText>Find a course</RollText>
            <span aria-hidden="true" className="ac-hero__cta-ring">
              <ArrowRight size={18} strokeWidth={1.5} />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- intro */

function Intro({ courses }: { courses: Course[] }) {
  return (
    <section aria-labelledby="ac-intro-title" className="ac-intro">
      <div className="pg-wrap ac-intro__grid">
        <div className="ac-intro__lead">
          <SplitReveal as="h2" className="ac-intro__title" id="ac-intro-title">
            Five public courses, on rotation.
          </SplitReveal>
        </div>
        <div className="ac-intro__body">
          <Rise as="p" className="ac-intro__text">
            There is something for every level, whether you are just starting out or deepening your craft. Every session is practical, interactive and hands on.
          </Rise>
          <Rise as="ol" className="ac-intro__index" delay={120}>
            {courses.map((c) => (
              <li key={c.product.handle}>
                <a
                  className="ac-intro__link"
                  href={`#ac-${c.product.handle}`}
                  onClick={(e) => {
                    e.preventDefault();
                    jumpTo(`ac-${c.product.handle}`);
                  }}
                >
                  <span className="ac-intro__num t-num">{c.number}</span>
                  <span className="ac-intro__name">{c.product.title}</span>
                  <span className="ac-intro__state">{c.sessions.length ? `${c.sessions.length} ${c.sessions.length === 1 ? "date" : "dates"}` : "New dates soon"}</span>
                </a>
              </li>
            ))}
          </Rise>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- course */

function CourseSheet({ course }: { course: Course }) {
  const { product, number, summary, venue, duration, price, sessions } = course;
  const img = COURSE_IMAGE[product.handle] ?? { src: product.images[0], w: 1200, h: 900, alt: product.title };
  const titleId = `ac-${product.handle}-title`;
  return (
    <li className="ac-course pg-anchor" id={`ac-${product.handle}`} tabIndex={-1}>
      <article aria-labelledby={titleId} className="ac-course__grid">
        <DrawRule className="ac-course__rule" />
        <span aria-hidden="true" className="ac-course__num t-num">
          {number}
        </span>
        <RevealMedia className="ac-course__media pg-frame">
          <div className="pg-fill">
            <img alt={img.alt} data-pg-speed="5" decoding="async" height={img.h} loading="lazy" src={img.src} width={img.w} />
          </div>
        </RevealMedia>
        <div className="ac-course__copy">
          <SplitReveal as="h3" className="ac-course__title" id={titleId}>
            {product.title}
          </SplitReveal>
          <Rise as="dl" className="ac-course__meta" delay={80}>
            {duration ? (
              <div>
                <dt>Duration</dt>
                <dd>{duration}</dd>
              </div>
            ) : null}
            <div>
              <dt>Per person</dt>
              <dd className="t-num">{rand(price)}</dd>
            </div>
            {venue ? (
              <div>
                <dt>Venue</dt>
                <dd>{venue}</dd>
              </div>
            ) : null}
          </Rise>
          <Rise as="p" className="ac-course__summary" delay={140}>
            {summary}
          </Rise>

          <Rise className="ac-dates" delay={200}>
            <p className="ac-dates__label t-label">{sessions.length ? "Upcoming dates" : "Dates"}</p>
            {sessions.length ? (
              <ul className="ac-dates__list">
                {sessions.map((s) => (
                  <li key={s.variant.id}>
                    <PageLink aria-label={`Book ${product.title} on ${s.weekday} ${s.day}, ${s.time}`} className="ac-book" href={`/shop/${product.handle}`}>
                      <span className="ac-book__day">
                        <span className="ac-book__weekday">{s.weekday}</span>
                        <span className="ac-book__date">{s.day}</span>
                      </span>
                      <span className="ac-book__time t-num">{s.time}</span>
                      <span className="ac-book__price t-num">{rand(s.variant.price)}</span>
                      <span className="ac-book__go">
                        <span>Book</span>
                        <ArrowRight aria-hidden="true" className="ac-book__arrow" size={18} strokeWidth={1.5} />
                      </span>
                    </PageLink>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ac-soon">
                <p className="ac-soon__badge">
                  <span aria-hidden="true" className="ac-soon__dot" />
                  New dates soon
                </p>
                <a
                  className="ac-soon__link"
                  href={`mailto:${CONTACT.academyEmail}?subject=${encodeURIComponent(`${product.title}: new dates`)}`}
                >
                  <RollText>Ask us to let you know</RollText>
                  <Mail aria-hidden="true" size={16} strokeWidth={1.5} />
                </a>
              </div>
            )}
          </Rise>
        </div>
      </article>
    </li>
  );
}

/* ---------------------------------------------------- teams + venue hire */

function Teams() {
  const blocks = [
    {
      id: "teams",
      title: "Corporate team experiences",
      text: "We now offer a dedicated monthly slot for corporate teams looking to do something fun and engaging together. Reach out, and we will make it happen.",
      cta: "Plan a team session",
      subject: "Corporate team experience",
    },
    {
      id: "venue",
      title: "Venue hire",
      text: "Want to host something in the Academy space? Email us with your idea and dates. Our team will review your request and come back to you with a quote and the terms and conditions.",
      cta: "Enquire about the space",
      subject: "Venue hire enquiry",
    },
  ];
  return (
    <section aria-label="Corporate teams and venue hire" className="ac-teams">
      <div className="pg-wrap">
        <GhostHeadline className="ac-teams__title">Bring your people.</GhostHeadline>
        <div className="ac-teams__grid">
          {blocks.map((b, i) => (
            <Rise as="article" aria-labelledby={`ac-${b.id}`} className="ac-block" delay={i * 80} key={b.id}>
              <span aria-hidden="true" className="ac-block__num t-num">
                {pad(i + 1)}
              </span>
              <h3 className="ac-block__title" id={`ac-${b.id}`}>
                {b.title}
              </h3>
              <p className="ac-block__text">{b.text}</p>
              <a className="ac-mail" href={`mailto:${CONTACT.academyEmail}?subject=${encodeURIComponent(b.subject)}`}>
                <span className="ac-mail__cta">{b.cta}</span>
                <span className="ac-mail__addr">
                  {CONTACT.academyEmail}
                  <ArrowUpRight aria-hidden="true" className="ac-mail__arrow" size={20} strokeWidth={1.5} />
                </span>
              </a>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- gallery */

const GALLERY = [
  { src: "/assets/academy/space.webp", w: 600, h: 400, alt: "The Academy space, set up for a class", cap: "The space", cls: "ac-g--a", speed: 4 },
  { src: "/assets/community/hackathon-2.webp", w: 400, h: 600, alt: "A guest at the Loveable Hackathon in the Academy", cap: null, cls: "ac-g--b", speed: -8 },
  { src: "/assets/academy/shelves.webp", w: 1024, h: 683, alt: "Shelves of coffee gear and books at the Academy", cap: "The shelves", cls: "ac-g--c", speed: 6 },
  { src: "/assets/community/hackathon-1.webp", w: 600, h: 338, alt: "A full room at the Loveable Hackathon", cap: "The Loveable Hackathon, hosted in our space", cls: "ac-g--d", speed: -4 },
  { src: "/assets/community/hackathon-3.webp", w: 450, h: 600, alt: "Hackathon guests working together around a table", cap: null, cls: "ac-g--e", speed: 10 },
];

function Gallery() {
  return (
    <section aria-labelledby="ac-gallery-title" className="ac-gallery">
      <div className="pg-wrap">
        <div className="ac-gallery__head">
          <SplitReveal as="h2" className="ac-gallery__title" id="ac-gallery-title">
            Inside the Academy
          </SplitReveal>
          <Rise as="p" className="ac-gallery__note" delay={120}>
            Espresso machines, a cupping table, and a room that also opens up to the community.
          </Rise>
        </div>
        <div className="ac-gallery__grid">
          {GALLERY.map((g, i) => (
            <figure className={`ac-g ${g.cls}`} key={g.src}>
              <div className="ac-g__float" data-pg-speed={g.speed}>
                <RevealMedia className="ac-g__frame pg-frame" delay={(i % 3) * 80}>
                  <img alt={g.alt} decoding="async" height={g.h} loading="lazy" src={g.src} width={g.w} />
                </RevealMedia>
                {g.cap ? <figcaption className="ac-g__cap t-label">{g.cap}</figcaption> : null}
              </div>
            </figure>
          ))}
        </div>
        <Rise className="ac-gallery__foot" delay={80}>
          <PageLink className="ac-foot-link" href="/shop">
            <RollText>Shop coffee for home</RollText>
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
          </PageLink>
        </Rise>
      </div>
    </section>
  );
}
