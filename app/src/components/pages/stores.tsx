// /stores: "Find your Platō". Search and region filters over the published
// branches, local-twist photography, the wider footprint and the loyalty app.
// Namespace: st-.
import { ArrowLeft, ArrowRight, ArrowUpRight, MapPin, Plus, Search, Smartphone, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { GhostHeadline, RollText, SplitReveal } from "@/components/site/text/reveal";
import { PlatoSymbol } from "@/components/site/wordmark";
import { prefersReducedMotion } from "@/lib/motion/smooth";
import { BRANCHES, CONTACT, LOCAL_STORES, STORE_COUNT, mapsUrl } from "@/lib/site";
import type { Branch } from "@/lib/site";

import { NewTab, Rise, jumpTo, useHeroReveal, useParallax } from "./shared";
import "./stores.css";

const REGIONS: Branch["region"][] = ["Gauteng", "Western Cape", "Mpumalanga", "Limpopo", "North West"];
type RegionFilter = Branch["region"] | "All";
type Sort = "number" | "name";

const pad = (n: number) => String(n).padStart(2, "0");

/** "Mon to Sat: 6am to 6pm · Sun: 7am to 6pm" → one entry per line. */
const hourLines = (hours: string) => hours.split("·").map((h) => h.trim());

/** The hours most of `list` keep, and whether every café in `list` keeps them. */
function sharedHours(list: Branch[]) {
  const tally = new Map<string, number>();
  for (const b of list) tally.set(b.hours, (tally.get(b.hours) ?? 0) + 1);
  let hours = "";
  let most = 0;
  for (const [h, n] of tally) {
    if (n > most) {
      hours = h;
      most = n;
    }
  }
  return { hours, all: list.length > 0 && most === list.length };
}

const STREETISH = /^(\d|cnr\b|corner\b|shop\b)|\b(street|st|road|avenue|ave|drive|boulevard|crossing)\b/i;

/** Suburb and city without the street: "57, 13th Street, Menlo Park, Pretoria" → "Menlo Park, Pretoria". */
function locality(address: string) {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const places = parts.filter((p) => !STREETISH.test(p));
  return (places.length ? places : parts).slice(-2).join(", ");
}

/** Lower case, accents stripped, one char per source char (so match indices map back). */
function fold(s: string) {
  return Array.from(s)
    .map((c) => {
      const f = c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      return f.length === 1 ? f : c.toLowerCase().slice(0, 1) || " ";
    })
    .join("");
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = fold(query.trim());
  if (!q) return <>{text}</>;
  const chars = Array.from(text);
  const hay = fold(text);
  const at = hay.indexOf(q);
  if (at < 0) return <>{text}</>;
  const qLen = Array.from(q).length;
  return (
    <>
      {chars.slice(0, at).join("")}
      <mark className="st-mark">{chars.slice(at, at + qLen).join("")}</mark>
      {chars.slice(at + qLen).join("")}
    </>
  );
}

export function StoresPage() {
  const root = useRef<HTMLElement>(null);
  useParallax(root);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionFilter>("All");
  const [sort, setSort] = useState<Sort>("number");
  const deferred = useDeferredValue(query);

  const counts = useMemo(() => {
    const m = new Map<RegionFilter, number>([["All", BRANCHES.length]]);
    for (const r of REGIONS) m.set(r, BRANCHES.filter((b) => b.region === r).length);
    return m;
  }, []);

  const results = useMemo(() => {
    const q = fold(deferred.trim());
    const list = BRANCHES.filter((b) => {
      if (region !== "All" && b.region !== region) return false;
      if (!q) return true;
      return fold(`${b.name} ${b.address} ${b.region}`).includes(q);
    });
    return list.slice().sort((a, b) => (sort === "number" ? a.cafe - b.cafe || a.opened.localeCompare(b.opened) : a.name.localeCompare(b.name)));
  }, [deferred, region, sort]);

  const common = useMemo(() => sharedHours(results), [results]);

  const reset = () => {
    setQuery("");
    setRegion("All");
  };

  return (
    <main className="pg st" id="main" ref={root}>
      <StoresHero
        counts={counts}
        onQuery={setQuery}
        onRegion={setRegion}
        query={query}
        region={region}
        resultCount={results.length}
      />

      <section aria-labelledby="st-results-title" className="st-results pg-anchor" id="st-results" tabIndex={-1}>
        <div className="pg-wrap">
          <div className="st-results__bar">
            <h2 className="st-results__title" id="st-results-title">
              <span aria-live="polite" className="t-num">
                {results.length === 0 ? "No cafés" : `${results.length} ${results.length === 1 ? "café" : "cafés"}`}
              </span>
              <span className="st-results__scope">{region === "All" ? "listed here" : `listed in ${region}`}</span>
            </h2>
            <div aria-label="Sort stores" className="st-sort" role="group">
              <button aria-pressed={sort === "number"} className="st-sort__btn" onClick={() => setSort("number")} type="button">
                By café number
              </button>
              <button aria-pressed={sort === "name"} className="st-sort__btn" onClick={() => setSort("name")} type="button">
                A to Z
              </button>
            </div>
          </div>

          {results.length ? (
            <>
              {/* Compact (phone) list: the hours are said once here instead of on every row. */}
              <div className="st-hours">
                <span className="st-hours__label t-label">
                  {common.all ? (results.length === 1 ? "Hours" : "Hours at every café listed") : "Hours at most cafés"}
                </span>
                <p className="st-hours__lines">
                  {hourLines(common.hours).map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                </p>
                {common.all ? null : <p className="st-hours__note">Cafés with different hours are marked below.</p>}
              </div>
              <ul className="st-grid">
                {results.map((b, i) => (
                  <StoreCard branch={b} commonHours={common.hours} index={i} key={`${b.name}-${b.cafe}`} query={deferred} />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState onReset={reset} query={deferred} region={region} />
          )}

          <p className="st-results__note">
            This list shows the {BRANCHES.length} cafés with published details, out of about {STORE_COUNT} locations. For any of the others, including the newest, search{" "}
            <a className="st-inline" href={CONTACT.maps} rel="noopener noreferrer" target="_blank">
              Platō on Google Maps
              <NewTab />
            </a>
            .
          </p>
        </div>
      </section>

      <LocalStrip />
      <Footprint />
      <AppBand />
    </main>
  );
}

/* ------------------------------------------------------------------ hero */

function StoresHero({
  query,
  onQuery,
  region,
  onRegion,
  counts,
  resultCount,
}: {
  query: string;
  onQuery: (q: string) => void;
  region: RegionFilter;
  onRegion: (r: RegionFilter) => void;
  counts: Map<RegionFilter, number>;
  resultCount: number;
}) {
  const { play, stage } = useHeroReveal();
  const input = useRef<HTMLInputElement>(null);
  const filters: RegionFilter[] = ["All", ...REGIONS];

  return (
    <section aria-labelledby="st-title" className="st-hero" data-pg-hero={stage}>
      <div className="pg-wrap st-hero__grid">
        <div className="st-hero__meta pg-in">
          <span className="t-label">Stores</span>
          <span className="t-label st-hero__meta-end">About {STORE_COUNT} locations, and London</span>
        </div>

        <div className="st-hero__main">
          <h1 className="st-hero__title" id="st-title">
            <GhostHeadline as="span" className="st-hero__l1" play={play} trigger="manual">
              Find your
            </GhostHeadline>
            <GhostHeadline as="span" className="st-hero__l2" play={play} style={{ "--reveal-delay": "160ms" } as CSSProperties} trigger="manual">
              Platō.
            </GhostHeadline>
          </h1>

          <form
            className="st-search pg-in"
            onSubmit={(e) => {
              e.preventDefault();
              jumpTo("st-results");
            }}
            role="search"
            style={{ "--d": "520ms" } as CSSProperties}
          >
            <label className="st-search__label t-label" htmlFor="st-q">
              Search the cafés
            </label>
            <div className="st-search__field">
              <Search aria-hidden="true" className="st-search__icon" size={22} strokeWidth={1.5} />
              <input
                autoComplete="off"
                className="st-search__input"
                enterKeyHint="search"
                id="st-q"
                onChange={(e) => onQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && query) {
                    e.preventDefault();
                    onQuery("");
                  }
                }}
                placeholder="Name, suburb or city"
                ref={input}
                spellCheck={false}
                type="search"
                value={query}
              />
              {query ? (
                <button
                  aria-label="Clear search"
                  className="st-search__clear"
                  onClick={() => {
                    onQuery("");
                    input.current?.focus();
                  }}
                  type="button"
                >
                  <X aria-hidden="true" size={18} strokeWidth={1.5} />
                </button>
              ) : null}
              <span aria-hidden="true" className="st-search__count t-num">
                {pad(resultCount)}
              </span>
            </div>
          </form>

          <div aria-label="Filter by region" className="st-chips pg-in" role="group" style={{ "--d": "640ms" } as CSSProperties}>
            {filters.map((r) => {
              const n = counts.get(r) ?? 0;
              return (
                <button aria-pressed={region === r} className="st-chip" key={r} onClick={() => onRegion(r)} type="button">
                  <span className="st-chip__label">{r === "All" ? "All regions" : r}</span>
                  <span className="st-chip__count t-num">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="st-hero__media pg-frame pg-wipe" data-from="right" style={{ "--d": "260ms" } as CSSProperties}>
          <div className="pg-fill">
            <img alt="Customers at the window of a white Platō storefront" data-pg-speed="6" decoding="async" fetchPriority="high" height={1181} src="/assets/stores/storefront-night.webp" width={2000} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ card */

function StoreCard({ branch, commonHours, index, query }: { branch: Branch; commonHours: string; index: number; query: string }) {
  const hours = hourLines(branch.hours);
  const id = `st-${branch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${branch.cafe}`;
  // Compact rows show the suburb; if the search only matches the street, show the full address so the match is visible.
  const loc = locality(branch.address);
  const q = fold(query.trim());
  const place = q && !fold(`${branch.name} ${loc}`).includes(q) && fold(branch.address).includes(q) ? branch.address : loc;
  return (
    <Rise as="li" className="st-card" delay={(index % 3) * 80}>
      <article aria-labelledby={id} className="st-card__in">
        <header className="st-card__top">
          <span className="st-card__no">
            <span className="t-label">Café</span>
            <span className="st-card__num t-num">{pad(branch.cafe)}</span>
          </span>
          <span className="st-card__region t-label">{branch.region}</span>
        </header>
        <h3 className="st-card__name" id={id}>
          <Highlight query={query} text={branch.name} />
        </h3>
        <p className="st-card__addr">
          <Highlight query={query} text={branch.address} />
        </p>
        <p className="st-card__loc">
          <Highlight query={query} text={place} />
        </p>
        <dl className="st-card__facts">
          <div>
            <dt>Opened</dt>
            <dd>{branch.opened}</dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>
              {hours.map((h) => (
                <span className="st-card__hour" key={h}>
                  {h}
                </span>
              ))}
            </dd>
          </div>
        </dl>
        {branch.hours !== commonHours ? (
          <details className="st-card__own">
            <summary className="st-card__own-sum">
              <span>Different hours</span>
              <Plus aria-hidden="true" className="st-card__own-icon" size={16} strokeWidth={1.5} />
            </summary>
            <p className="st-card__own-lines">
              {hours.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </p>
          </details>
        ) : null}
        <a
          aria-label={`Directions to Platō ${branch.name} (opens Google Maps in a new tab)`}
          className="st-dir"
          href={mapsUrl(branch)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="st-dir__pin" aria-hidden="true">
            <MapPin size={18} strokeWidth={1.5} />
          </span>
          <span className="st-dir__label">Directions</span>
          <ArrowUpRight aria-hidden="true" className="st-dir__arrow" size={18} strokeWidth={1.5} />
        </a>
      </article>
    </Rise>
  );
}

function EmptyState({ query, region, onReset }: { query: string; region: RegionFilter; onReset: () => void }) {
  const what = query.trim() ? `“${query.trim()}”` : "that search";
  return (
    <div className="st-empty" role="status">
      <PlatoSymbol aria-hidden="true" className="st-empty__mark" title="" />
      <div className="st-empty__copy">
        <p className="st-empty__title">No Platō here yet.</p>
        <p className="st-empty__text">
          We could not find {what}
          {region !== "All" ? ` in ${region}` : ""} among the cafés listed here. Try a suburb or city, or clear the filters.
        </p>
        <div className="st-empty__actions">
          <button className="st-empty__reset" onClick={onReset} type="button">
            <RollText>Clear filters</RollText>
          </button>
          <a className="st-inline" href={CONTACT.maps} rel="noopener noreferrer" target="_blank">
            Search every location on Google Maps
            <NewTab />
          </a>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- local strip */

function LocalStrip() {
  const track = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const p = max > 0 ? el.scrollLeft / max : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${0.12 + p * 0.88})`;
      setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft > max - 4 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    // Mouse drag to scroll (touch and trackpads scroll natively).
    let down = false;
    let moved = 0;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      moved = 0;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      el.dataset.drag = "true";
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      down = false;
      delete el.dataset.drag;
    };
    const onClick = (e: MouseEvent) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".st-local__item");
    const w = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * w, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <section aria-labelledby="st-local-title" className="st-local">
      <div className="pg-wrap st-local__head">
        <GhostHeadline className="st-local__title" id="st-local-title">
          Same Platō, a little bit local.
        </GhostHeadline>
        <div className="st-local__side">
          <SplitReveal className="st-local__line" delay={120}>
            The same clean, white café everywhere, with a twist that belongs to the street it is on.
          </SplitReveal>
          <div className="st-local__nav">
            <button aria-label="Previous stores" className="st-round" disabled={edges.start} onClick={() => step(-1)} type="button">
              <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>
            <button aria-label="Next stores" className="st-round" disabled={edges.end} onClick={() => step(1)} type="button">
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
      <ul aria-label="Local stores" className="st-local__track" ref={track}>
        {LOCAL_STORES.map((s, i) => (
          <li className="st-local__item" key={s.name}>
            <figure className="st-local__fig">
              <div className="st-local__frame pg-frame">
                <img alt={`Platō ${s.name}`} decoding="async" draggable={false} height={1333} loading="lazy" src={s.image} width={2000} />
              </div>
              <figcaption className="st-local__cap">
                <span className="st-local__num t-num">{pad(i + 1)}</span>
                <span className="st-local__name">{s.name}</span>
                <span className="st-local__desc">{s.line}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <div className="pg-wrap">
        <span aria-hidden="true" className="st-local__progress">
          <span className="st-local__bar" ref={bar} />
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ footprint */

function Counter({ to, children }: { to: number; children?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen: keep the real number
    setValue(0);
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1800;
        const frame = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(2, -10 * t);
          setValue(Math.round(eased * to));
          if (t < 1) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span className="st-count t-num" ref={ref}>
      <span aria-hidden="true">{value}</span>
      <span className="sr-only">{to}</span>
      {children}
    </span>
  );
}

function Footprint() {
  return (
    <section aria-labelledby="st-foot-title" className="st-foot">
      <h2 className="sr-only" id="st-foot-title">
        Where Platō is today
      </h2>
      <div className="pg-wrap st-foot__grid">
        <Rise className="st-foot__sa">
          <p className="st-foot__big">
            <span className="st-foot__about">About</span>
            <Counter to={STORE_COUNT} />
          </p>
          <p className="st-foot__label">locations across South Africa</p>
        </Rise>
        <Rise className="st-foot__ldn" delay={120}>
          <p className="st-foot__and">And London.</p>
          <p className="st-foot__addr">
            <MapPin aria-hidden="true" size={18} strokeWidth={1.5} />
            Norton Folgate, Bishopsgate
          </p>
        </Rise>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- app band */

function AppBand() {
  return (
    <section aria-labelledby="st-app-title" className="st-app">
      <div className="pg-wrap st-app__grid">
        <PlatoSymbol aria-hidden="true" className="st-app__mark" title="" />
        <div className="st-app__copy">
          <GhostHeadline className="st-app__title" id="st-app-title">
            Take Platō with you.
          </GhostHeadline>
          <SplitReveal className="st-app__line" delay={120}>
            Download the Platō loyalty app before your next visit.
          </SplitReveal>
          <Rise delay={200}>
            <a className="st-get" href={CONTACT.loyaltyApp} rel="noopener noreferrer" target="_blank">
              <span className="st-get__icon" aria-hidden="true">
                <Smartphone size={20} strokeWidth={1.5} />
              </span>
              <span className="st-get__label">Get the loyalty app</span>
              <ArrowUpRight aria-hidden="true" className="st-get__arrow" size={20} strokeWidth={1.5} />
              <NewTab />
            </a>
          </Rise>
        </div>
      </div>
    </section>
  );
}
