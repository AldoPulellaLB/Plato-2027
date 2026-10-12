// PLATŌ site content, taken from plato.coffee (navigation, contact, branches,
// testimonials, story) and the client storyboard brief.

export interface LinkItem {
  label: string;
  href: string;
  external?: boolean;
}

/** The four story chapters on the home page (anchor ids live on the page). */
export const CHAPTERS = [
  { id: "bean", label: "Bean", number: "01", title: "The Bean" },
  { id: "pour", label: "Pour", number: "02", title: "The Pour" },
  { id: "brand", label: "Brand", number: "03", title: "The Brand" },
  { id: "menu", label: "Menu", number: "04", title: "The Menu" },
] as const;
export type ChapterId = (typeof CHAPTERS)[number]["id"];

/** Full-screen menu: every page of the site, with a preview photo for each. */
export const PAGES: (LinkItem & { image: string; caption: string })[] = [
  { label: "The Experience", href: "/", image: "/assets/interiors/perforated-overhead.webp", caption: "From the roast to the regular" },
  { label: "Shop", href: "/shop", image: "/assets/brand/house-blend-250g.webp", caption: "Coffee, pods, pantry and wear" },
  { label: "Equipment", href: "/equipment", image: "/assets/equipment/appartamento.webp", caption: "Rocket and Eureka for home" },
  { label: "The Academy", href: "/academy", image: "/assets/academy/group-head.webp", caption: "Courses for every level" },
  { label: "Our Menu", href: "/menu", image: "/assets/drinks/aristotle.webp", caption: "Built on ristretto" },
  { label: "Stores", href: "/stores", image: "/assets/stores/hermanus.webp", caption: "Find your Platō" },
  { label: "Our Story", href: "/our-story", image: "/assets/interiors/green-wall-bust.webp", caption: "Coffee sculpted. Community included." },
  { label: "Account", href: "/account", image: "/assets/community/baristas-smile.webp", caption: "Orders and details" },
];

export const WORK_WITH_US: LinkItem[] = [
  { label: "Join the Platō team", href: "https://careers.plato.coffee", external: true },
  { label: "Franchise application", href: "https://plato.coffee/pages/franchises", external: true },
  { label: "Wholesale beans", href: "mailto:john@blanksupplies.co?subject=Wholesale%20coffee%20beans", external: true },
  { label: "Events enquiries", href: "https://plato.coffee/pages/events-enquiries", external: true },
];

export const VISIT: LinkItem[] = [
  { label: "All stores", href: "/stores" },
  { label: "Google Maps", href: "https://maps.app.goo.gl/BEvXtUks366GxJx89", external: true },
  { label: "Loyalty app", href: "https://onelink.to/ftsesm", external: true },
  { label: "Gift vouchers", href: "https://wrappedgifts.co.za/partner/plato", external: true },
];

export const LEGAL: LinkItem[] = [
  { label: "Privacy policy", href: "https://plato.coffee/policies/privacy-policy", external: true },
  { label: "Terms of use", href: "https://plato.coffee/policies/terms-of-service", external: true },
  { label: "Refund policy", href: "https://plato.coffee/policies/refund-policy", external: true },
];

export const SOCIALS: LinkItem[] = [
  { label: "Instagram", href: "https://www.instagram.com/plato.coffee/", external: true },
  { label: "TikTok", href: "https://www.tiktok.com/@plato.coffee", external: true },
  { label: "Facebook", href: "https://www.facebook.com/coffee.plato/", external: true },
  { label: "LinkTree", href: "https://linktr.ee/plato.coffee", external: true },
];

export const CONTACT = {
  email: "hello@plato.coffee",
  academyEmail: "hello@theacademy.coffee",
  whatsapp: "https://api.whatsapp.com/send/?phone=27645226743&text&type=phone_number&app_absent=0",
  hours: ["Mon to Sat: 6am to 6pm", "Sun: 7am to 6pm"],
  tagline: "Coffee sculpted. Community included.",
  loyaltyApp: "https://onelink.to/ftsesm",
  maps: "https://maps.app.goo.gl/BEvXtUks366GxJx89",
};

/** Real customer reviews published on plato.coffee. */
export const TESTIMONIALS: { quote: string; where: string }[] = [
  {
    quote:
      "Only good things to say about this coffee spot, the best staff who love to chat and share a bit about their day whilst they make you the best coffee around. My favourite coffee place by far!",
    where: "A regular",
  },
  {
    quote:
      "Oh my soul! What a spoil! I will definitely drive all the way from Rivonia just to be treated with the most pleasurable coffees ever.",
    where: "Worth the drive from Rivonia",
  },
  {
    quote:
      "I LOVE Platō and was so excited when they opened this location. Every time I go I'm met by some of the best customer service in the city.",
    where: "A new neighbour",
  },
  {
    quote:
      "Platō Coffee has the absolute best Freezos in town. I have tried almost all the Freezos I can find in my area and Platō takes the cake. Not only that, but their staff are so kind and friendly too.",
    where: "Freezo loyalist",
  },
];

/**
 * Store count used across the site, per the client storyboard (f05 "One taste.
 * 150 stores.", f11 "About 150 stores"). plato.coffee says "over 140": this
 * figure is awaiting client confirmation. If it changes, change every instance
 * in one pass (STORY.presence, f05's counter and the cups grid, page copy).
 */
export const STORE_COUNT = 150;

export const STORY = {
  intro:
    "What began as a dream became a side hustle, and eventually a full-time mission to bring people together over great coffee.",
  presence: `Platō is now in about ${STORE_COUNT} locations across South Africa, and in London. Our focus has always been on purpose: accessible, community-driven spaces where quality and connection matter.`,
  mission: "To serve exceptional coffee in places that feel like home.",
  vision: "To build one of Africa's most loved lifestyle brands through consistency, connection and craft.",
  craft:
    "We roast our own coffee at Blank, operate our own bakery, supply our own equipment, and keep investing in our infrastructure, so every Platō experience feels both personal and professional.",
  founders: "Stephan & Petrus Bredell",
};

export interface Branch {
  name: string;
  cafe: number;
  opened: string;
  address: string;
  region: "Gauteng" | "Western Cape" | "Mpumalanga" | "Limpopo" | "North West";
  hours: string;
}

const H = "Mon to Sat: 6am to 6pm · Sun: 7am to 6pm";

export const BRANCHES: Branch[] = [
  { name: "Irene", cafe: 1, opened: "7 December 2019", address: "Corner of Nelmapius & Main Avenue, Irene, Pretoria", region: "Gauteng", hours: H },
  { name: "Rustenburg", cafe: 2, opened: "15 July 2020", address: "193 Kock Street, Rustenburg", region: "North West", hours: H },
  { name: "Menlo Park", cafe: 8, opened: "1 April 2022", address: "57, 13th Street, Menlo Park, Pretoria", region: "Gauteng", hours: H },
  { name: "Garsfontein", cafe: 9, opened: "23 April 2022", address: "649 Borzoi Street, Garsfontein, Pretoria", region: "Gauteng", hours: H },
  { name: "Glen Village", cafe: 11, opened: "26 June 2023", address: "Corner of Solomon Mahlangu & Olympus Drive, Faerie Glen, Pretoria", region: "Gauteng", hours: H },
  { name: "Parkmore", cafe: 12, opened: "8 July 2022", address: "130, 11th Street, Parkmore, Johannesburg", region: "Gauteng", hours: "Mon to Fri: 6am to 6pm · Sat: 7am to 5pm · Sun: 7am to 6pm" },
  { name: "Hermanus", cafe: 13, opened: "20 August 2022", address: "4 Mitchell Street, Hermanus, Western Cape", region: "Western Cape", hours: "Mon to Sat: 7am to 5pm · Sun: 8am to 1pm" },
  { name: "Boksburg", cafe: 14, opened: "23 September 2022", address: "102 Rietfontein Road, Jansen Park, Boksburg", region: "Gauteng", hours: H },
  { name: "Meyersdal", cafe: 15, opened: "1 November 2022", address: "Cnr of Nelson Mandela & Blue Crane Drive, Meyersdal, Alberton", region: "Gauteng", hours: H },
  { name: "Stellenbosch", cafe: 16, opened: "5 November 2022", address: "15 Krige Road, Stellenbosch Central, Stellenbosch", region: "Western Cape", hours: H },
  { name: "Inscape", cafe: 17, opened: "5 December 2022", address: "Cnr of Corobay Ave & Nutmeg Ave, Waterkloof Glen, Pretoria", region: "Gauteng", hours: H },
  { name: "Craighall Park", cafe: 18, opened: "18 December 2022", address: "The Woods, 345 Jan Smuts Ave, Craighall Park, Randburg", region: "Gauteng", hours: H },
  { name: "Nelspruit", cafe: 19, opened: "28 January 2023", address: "41 Ferreira Street, Mbombela", region: "Mpumalanga", hours: H },
  { name: "Ferndale", cafe: 20, opened: "8 February 2023", address: "Cnr of Malibongwe & Hill Street, Ferndale, Randburg", region: "Gauteng", hours: H },
  { name: "Secunda", cafe: 20, opened: "25 February 2023", address: "6 Coen Brits Street, Secunda", region: "Mpumalanga", hours: H },
  { name: "Potchefstroom", cafe: 21, opened: "1 April 2023", address: "68 Steve Biko Street, Potchefstroom", region: "North West", hours: H },
  { name: "Stilbaai", cafe: 22, opened: "8 April 2023", address: "7 Van Riebeeck Street, Still Bay West, Still Bay", region: "Western Cape", hours: "Mon to Sun: 7am to 6pm" },
  { name: "Elardus Park", cafe: 23, opened: "6 May 2023", address: "846 Barnard Street, Elardus Park, Pretoria", region: "Gauteng", hours: H },
  { name: "George", cafe: 25, opened: "5 June 2023", address: "Shop 17, York Street Boulevard, York Street, George", region: "Western Cape", hours: H },
  { name: "Stellenbosch Versus", cafe: 27, opened: "20 June 2023", address: "145 Dorp Street, Stellenbosch Central, Stellenbosch", region: "Western Cape", hours: H },
  { name: "Paarl", cafe: 28, opened: "23 June 2023", address: "282 Main Road, Esterville, Paarl", region: "Western Cape", hours: H },
  { name: "Mokopane", cafe: 29, opened: "1 July 2023", address: "109 Pretorius St, Mokopane", region: "Limpopo", hours: H },
  { name: "De Waterkant", cafe: 30, opened: "29 July 2023", address: "Cnr of Chiappini & Waterkant Street, De Waterkant, Cape Town", region: "Western Cape", hours: H },
  { name: "Wierdapark", cafe: 31, opened: "25 July 2023", address: "258 Chris Hougaard Street, Wierdapark, Centurion", region: "Gauteng", hours: H },
  { name: "Bedfordview", cafe: 31, opened: "5 August 2023", address: "55 Van Buuren Road, Bedfordview, Johannesburg", region: "Gauteng", hours: H },
  { name: "Bryanston", cafe: 32, opened: "12 August 2023", address: "Coachman's Crossing, Peter Place, Bryanston, Johannesburg", region: "Gauteng", hours: H },
];

export function mapsUrl(branch: Pick<Branch, "name" | "address">) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Plato Coffee ${branch.address}`)}`;
}

/** Frame 11: the same Platō, a little bit local (real store photography). */
export const LOCAL_STORES: { name: string; line: string; image: string }[] = [
  { name: "Hermanus", line: "Western Cape: a thatched heritage cottage", image: "/assets/stores/hermanus.webp" },
  { name: "Irene", line: "Pretoria: Café #1, where it started in 2019", image: "/assets/stores/container.webp" },
  { name: "Stellenbosch", line: "Western Cape: a window onto Krige Road", image: "/assets/stores/stellenbosch.webp" },
  { name: "Garsfontein", line: "Pretoria: a white facade at dusk", image: "/assets/stores/garsfontein.webp" },
  { name: "De Waterkant", line: "Cape Town: perforated light on Chiappini Street", image: "/assets/stores/de-waterkant.webp" },
  { name: "Meyersdal", line: "Alberton: black, teal and white", image: "/assets/stores/meyersdal.webp" },
  { name: "Stellenbosch Versus", line: "Dorp Street: a terrace in the oaks", image: "/assets/stores/stellenbosch-versus.webp" },
];

/** Browser chrome colour (roast black) for the theme-color meta tag. */
export const THEME_COLOR = "#121600";
