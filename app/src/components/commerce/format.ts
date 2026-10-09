// Presentation helpers for catalogue data (labels, dates, price summaries).
import { CATEGORIES, formatRand, liveVariants } from "@/lib/catalog";
import type { Category, Product, Variant } from "@/lib/catalog";

/** South African spelling for option names that arrive as "Color". */
export function optionLabel(name: string | null) {
  if (!name) return "Option";
  if (name.toLowerCase() === "color") return "Colour";
  return name;
}

export function categoryLabel(id: Category) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Shop";
}

export function isDefaultVariant(variant: Variant) {
  return variant.title === "Default Title";
}

/** Replace hyphen ranges ("09:00 - 15:00", "16-17 July") with "to". */
function rangeToWords(value: string) {
  return value.replace(/\s*-\s*/g, " to ").replace(/\s+/g, " ").trim();
}

/** "13 October 2026 | 13:00 - 15:00" → { date: "13 October 2026", time: "13:00 to 15:00" } */
export function splitDated(variant: Variant) {
  const [datePart, timePart] = variant.title.split("|").map((s) => s.trim());
  return { date: rangeToWords(datePart ?? variant.title), time: timePart ? rangeToWords(timePart) : null };
}

/** Variant title in South African spelling ("Gray" → "Grey"). */
export function variantLabel(variant: Variant) {
  return variant.title.replace(/\bGray\b/g, "Grey");
}

/** Human variant name for lines and summaries (null for single-variant products). */
export function variantName(product: Product, variant: Variant) {
  if (isDefaultVariant(variant)) return null;
  if (product.optionName === "Date") {
    const { date, time } = splitDated(variant);
    return time ? `${date}, ${time}` : date;
  }
  return variantLabel(variant);
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Short chip label: "13 Oct", "Whole Bean", "XL". */
export function variantChip(product: Product, variant: Variant) {
  if (product.optionName === "Date" && variant.date) {
    const [, m, d] = variant.date.split("-").map(Number);
    return `${d} ${MONTHS_SHORT[(m ?? 1) - 1]}`;
  }
  return variantLabel(variant).replace(/ Grind$/, "");
}

/** Variants that can be bought now (Academy dates in the past are hidden). */
export function buyable(product: Product) {
  return liveVariants(product);
}

/** Price summary for cards: a single price, a "from" price, or nothing on sale. */
export function priceSummary(product: Product) {
  const live = buyable(product);
  const pool = live.length ? live : product.variants;
  const prices = pool.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { cents: min, from: min !== max, onSale: live.length > 0 };
}

export function priceText(product: Product) {
  const p = priceSummary(product);
  return `${p.from ? "From " : ""}${formatRand(p.cents)}`;
}

/** Lowest live price, used for sorting. */
export function sortPrice(product: Product) {
  return priceSummary(product).cents;
}

const PLURALS: Record<string, [string, string]> = {
  Grind: ["grind", "grinds"],
  Size: ["size", "sizes"],
  Colour: ["colour", "colours"],
  Color: ["colour", "colours"],
};

/** Secondary line on cards: "3 grinds", "5 sizes", "Next date 13 Oct", "New dates soon". */
export function variantsMeta(product: Product) {
  const live = buyable(product);
  if (product.optionName === "Date") {
    if (!live.length) return "New dates coming soon";
    const next = [...live].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0];
    return `Next date ${variantChip(product, next)}`;
  }
  if (!product.optionName || live.length <= 1) return categoryLabel(product.category);
  const words = PLURALS[product.optionName] ?? ["option", "options"];
  return `${live.length} ${live.length === 1 ? words[0] : words[1]}`;
}

/** Packshots on white blend into the tile; photography fills it. */
export function imageFit(product: Product): "contain" | "cover" {
  return product.category === "academy" ? "cover" : "contain";
}

/**
 * "Platō Coffee Pods (Pack of 10 Nespresso Compatible Pods)" → main + sub.
 * "Premium Instant Drinks - Variety Pack" splits the same way, so a spaced
 * hyphen never shows as a dash in the copy.
 */
export function splitTitle(title: string) {
  const paren = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(title);
  if (paren) return { main: paren[1], sub: paren[2] as string | null };
  const dashed = /^(.+?)\s+-\s+(.+)$/.exec(title);
  if (dashed) return { main: dashed[1], sub: dashed[2] as string | null };
  return { main: title, sub: null as string | null };
}

/** Clean up scraped copy: number ranges as "to", stray spaces before punctuation, doubled spaces, spaced hyphens. */
function tidy(text: string) {
  return text
    .replace(/(\d)\s*-\s*(\d)/g, "$1 to $2")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\bhands-on\b/g, "hands\u2011on")
    .trim();
}

/** Venue line hidden inside Academy descriptions ("Venue 40 Canterbury Str, ..."). */
export function extractVenue(description: string) {
  const match = /\bVenue\s+(.+)$/.exec(description);
  return match ? tidy(match[1]).replace(/\.$/, "") : null;
}

/* ------------------------------------------------------------------ */
/* Spec sheets and preparation steps inside scraped descriptions        */
/* ------------------------------------------------------------------ */

export interface SpecRow {
  term: string;
  /** One or more lines (a dual-voltage rating is two). */
  lines: string[];
}

const SPEC_MARKER = /\s*(?:\bProduct Specifications:|\bSPECIFICATIONS\b:?)\s*/;
const STEPS_MARKER = /\s*\bPreparation Instructions:\s*/;
const KNOWN_SPEC_KEYS = ["Water Feed - Hard Plumbing", "Water Feed - Reservoir", "Wattage", "Dimensions", "Weight", "Allergens"];
const ACRONYMS = new Set(["PID", "ACE"]);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A key is a known label or a run of capitals ("TOTAL BOILER CAPACITY"), then a colon.
const SPEC_KEY = new RegExp(`(?:^|\\s)(${[...KNOWN_SPEC_KEYS.map(escapeRegExp), "[A-Z][A-Z0-9]*(?: [A-Z][A-Z0-9]*)*"].join("|")}):\\s*`, "g");

/** "PID PRESSURE CONTROL" → "PID pressure control"; "Water Feed - Reservoir" → "Water feed, reservoir". */
function sentenceCase(key: string) {
  return key
    .replace(/\s+-\s+/g, ", ")
    .split(" ")
    .map((word, i) => {
      if (ACRONYMS.has(word.replace(/,$/, ""))) return word;
      const lower = word.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
}

/** "220 - 240V | 50/60Hz | 1350W - 115V | 60Hz | 1300W" → ["220 to 240V, 50/60Hz, 1350W", "115V, 60Hz, 1300W"]. */
function specLines(value: string) {
  return value
    .replace(/(\d)\s*-\s*(\d)/g, "$1 to $2")
    .split(/\s+-\s+/)
    .map((part) => part.split(/\s*\|\s*/).join(", ").trim())
    .filter(Boolean);
}

function parseSpecs(text: string): { rows: SpecRow[]; before: string } {
  const matches = [...text.matchAll(SPEC_KEY)];
  const rows: SpecRow[] = [];
  matches.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const lines = specLines(text.slice(start, end).trim());
    if (lines.length) rows.push({ term: sentenceCase(match[1]), lines });
  });
  return { rows, before: matches.length ? text.slice(0, matches[0].index).trim() : text.trim() };
}

/**
 * Splits a scraped description into marketing copy, numbered preparation
 * steps and spec rows: "... SPECIFICATIONS PID PRESSURE CONTROL: No ...
 * Weight: 20 kg" becomes ledger rows instead of body text.
 */
export function splitDescription(description: string) {
  let copy = description;
  let specs: SpecRow[] = [];
  const specAt = SPEC_MARKER.exec(copy);
  if (specAt) {
    const parsed = parseSpecs(copy.slice(specAt.index + specAt[0].length));
    if (parsed.rows.length) {
      specs = parsed.rows;
      copy = `${copy.slice(0, specAt.index)} ${parsed.before}`;
    }
  }
  let steps: string[] = [];
  const stepsAt = STEPS_MARKER.exec(copy);
  if (stepsAt) {
    const list = copy
      .slice(stepsAt.index + stepsAt[0].length)
      .split(/(?:^|\s)\d+\.\s+/)
      .map((step) => tidy(step).replace(/\s*&\s*/g, " and "))
      .filter(Boolean)
      .map((step) => (/[.!?]$/.test(step) ? step : `${step}.`));
    if (list.length > 1) {
      steps = list;
      copy = copy.slice(0, stepsAt.index);
    }
  }
  // Shouted brand names and section headings from the supplier sheet read as body copy.
  copy = copy
    .replace(/\bFEATURES\b\s*/g, " ")
    .replace(/\b(ROCKET|EUREKA)\b/g, (word) => word.charAt(0) + word.slice(1).toLowerCase());
  return { copy, steps, specs };
}

/** Lede (first sentence) plus remaining paragraphs for the product story. */
export function storyCopy(description: string) {
  const withoutVenue = description.replace(/\bVenue\s+.+$/, "");
  const text = tidy(withoutVenue);
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const lede = sentences[0] ?? "";
  const rest = sentences.slice(1);
  // Group the rest into paragraphs of about three sentences.
  const paragraphs: string[] = [];
  for (let i = 0; i < rest.length; i += 3) paragraphs.push(rest.slice(i, i + 3).join(" "));
  return { lede, paragraphs };
}

/** "2026-10-09 10:22:11" (UTC from SQLite) → "9 October 2026" in South African time. */
export function formatOrderDate(value: string) {
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });
}

export function formatMonthYear(value: string) {
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Tidy a stored variant title for display ("13 October 2026 | 13:00 - 15:00" → "13 October 2026, 13:00 to 15:00"). */
export function prettyVariant(title: string) {
  if (!title.includes("|")) return rangeToWords(title).replace(/\bGray\b/g, "Grey");
  const [date, time] = title.split("|").map((s) => rangeToWords(s.trim()));
  return time ? `${date}, ${time}` : date;
}
