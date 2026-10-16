# PLATŌ: design brief (v2, "From the roast to the regular")

**Design read:** For South African coffee regulars, franchise applicants and press who should feel that every Platō cup is made the same way, by people who know them, in a store that feels local. The register moves from the hushed, warm dark of the roastery into the calm, sunlit white of the café.

**Concept spine:** "One cup, told as one continuous film." Scroll is the play button: a single cup is followed from green bean to regular. It starts in the dark of the roast (Blank roastery), opens into white at the pour (the only theme flip, the signature moment), lives in the brand (cups, stores, the bag), and ends at the menu and the counter. Every frame hands over to the next: beans become the drum, the cooling tray becomes a grid of cups, one cup becomes the shot, milk becomes the white café.

**Delivery tier:** spectacle. Lenis + GSAP ScrollTrigger, a persistent real-time WebGL layer (Three.js) for the bean, roast, tray, cup grid and cup family (Oryzo-style live 3D object carried across chapters), scroll-scrubbed film for the pour and the counter, layered parallax, ghost-serif headline reveals, a full-screen menu, and a page-height footer where the real PLATŌ wordmark letters rise in a staggered reveal.

**Animation mode: animated-website**

## Journey (the four chapters, ~2,470vh of story)

Journey shape: **multi-leg hybrid.** Chapters 1 and 3 are carried by a live WebGL scene (no film, no seams: the scene state is a pure function of scroll, so reverse scroll is exact). Chapter 2 carries the scroll-scrub film chain (two legs: The Pour, The Counter), chained through the white-out. Chapter 4 is DOM + photography.

| # | Chapter | Frames | Mode | Mechanic |
|---|---|---|---|---|
| 1 | The Bean | 01 Cold open, 02 Beans fall into the roaster, 03 The roast changes colour, 04 Cooling tray | Dark (roast black) | WebGL instanced 3D beans; roast colour, stage ticks and temperature tied to scroll; chaff flash at first crack; tray sweep loop |
| 2 | The Pour | 05 One taste, everywhere, 06 The ristretto shot, 07 The pour opens into light, 08 The barista knows your name, 09 Community included | Dark to white at 07 | WebGL cup grid with 1 to 150 counter; film leg A "The Pour" (ristretto, milk, latte art, white-out) scrubbed; theme flips when white covers the frame; film leg B "The Counter" (hands slide a cup across a white counter, pull back to the café); four-layer photo parallax with real customer quotes |
| 3 | The Brand | 10 The cup family, 11 Same store, local twist, 12 Take Platō home | White | WebGL cups drop in with a small bounce and turn toward the camera; horizontal pinned store gallery (real store photography) with a fixed counter band; House Blend bag with 3D beans spilling, price chips, Academy card |
| 4 | The Menu | 13 The signature menu, 14 Find your Platō | Deep green, then white | Horizontal pinned drink gallery with filter chips (real menu names and builds); closing ghost-serif line, store finder and app CTAs, phone mock-up |

- **Camera architecture:** A (continuous forward). Film leg A ends on full white; leg B begins high-key white; the DOM white mask carries the seam.
- **Seam direction:** downward push into the cup (A), then a slow backward pull from the counter (B). The backward pull is intentional: the coffee is handed over.
- **Mobile framing:** subjects center-safe; chapter copy bottom-anchored on mobile; mobile encodes at 720p; WebGL runs at reduced DPR and instance counts (4 x 6 cup grid instead of 10 x 15); horizontal galleries become native swipe with snap.
- **Reduced motion:** no pinning or scrubbing, no WebGL animation; each frame shows as a still with the copy as real text.
- **Delivery budget:** films at most 32 MiB desktop and 16 MiB mobile in total. WebGL geometry is procedural (no GLB downloads).
- **How the journey enacts the spine:** the visitor literally follows one bean to one cup to one person; the only colour-world change happens at the moment coffee is handed to a person.

## Locked palette (the client's brand, from plato.coffee, packaging and cups)

- Roast background, chapter one: one of three hero themes per page load, each with its own cup behind the headline (src/experience/hero-theme.ts): sea green `#010e08`, magenta `#0f0b08`, olive `#0c0d0a`, near-black with soft grain (was sea green `#011e10`, olive `#121600`, `#0E0D0B`; all changed at the client’s request)
- Platō green `#003C2F`: the logo green; ink on white and the primary accent
- Forest `#062A21`: chapter four (menu) and the footer; owned dark green instead of black
- Paper `#FBFBF8`: the white café world
- Stone `#E7E5DF` / Stone deep `#CFCBC2`: floors, plinths, hairlines
- Peach `#F2B9A3`: the medium cup, warm highlight
- Sage `#C9DCCD`: the small cup, soft surfaces
- Burgundy `#6E1F2C`: Platō Burgundy (merch, sale and error states)
- Bean green `#8FA06B` to chestnut `#5A3420`: the roast ramp (WebGL only)
- Ink `#0F1D18`: body text on white (green-black)

Defense: these are Platō's own colours (logo green, cup colours, burgundy crew, white stores, stone floors). Dark-to-white is the brief's approved story device; no orange or amber UI accent is used in the dark chapters (the accent there is sage and paper).

## Locked type

- **Jost** (variable 300 to 600, self-hosted): the brand's own web face on plato.coffee. UI, labels, prices, and the menu's wide-tracked uppercase drink names (0.24em), echoing the in-store menu board.
- **Outfit** (Google Fonts, variable, self-hosted, regular 400, upright only): statement lines and titles (one statement per frame), set huge (clamp 56px to 176px) and resolving from a blurred ghost double. Changed at the client's request from Instrument Serif (regular and italic); the former italic accent lines are now upright.
- The **PLATŌ wordmark is always the real SVG** (letter paths P, L, A, T, Ō). Never typeset, never generated.

## Section plan (after the four chapters)

1. Journey (chapters 1 to 4, frames 01 to 14)
2. **Shop the counter** (products): a horizontal product rail with quick add (layout: rail)
3. **Equipment**: an editorial split with a giant machine image and spec ledger (layout: editorial spread)
4. **The Academy**: dated course cards over academy photography (layout: stacked index list with hover image reveal)
5. **Testimonials**: one huge serif quote at a time, cross-faded, with a numbered index (layout: single-statement carousel)
6. **Footer**: page height, forest green, links grid, and the giant PLATŌ wordmark revealed letter by letter (layout: typographic poster)

Eyebrow budget: 2 outside the chapter labels (chapter labels are the brief's own "Chapter one: the bean" device).

## Persistent interface

- Top bar: PLATŌ wordmark (left), four chapter links Bean, Pour, Brand, Menu with active underline (center), profile, cart with live count, burger (right). Thin progress line along the top edge. Theme flips with the story (dark until frame 07, white after, forest in the menu).
- Full-screen menu: every page (Experience, Shop, Coffee, Equipment, The Academy, Our Menu, Stores, Our Story, Account), plus work-with-us links, socials and contact; links roll on hover; a photo preview follows the hovered link.
- Sound toggle bottom left, off by default (roaster hum, one crackle at first crack, café murmur).
- "Find a store" pill appears after frame 08.

## Pages

`/` experience; `/shop` and `/shop/$handle`; `/equipment`; `/academy`; `/menu`; `/stores`; `/our-story`; `/account` (sign in, register, orders); `/cart`; `/checkout/success`; webhook route for Stripe.

## Store

Built-in store, ZAR, server-validated prices, cart persisted on the device, Stripe Checkout (needs `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; without them checkout shows a clear "payments not connected yet" state). Optional platform secret `STRIPE_SHIPPING_RATE_ID` (a Stripe `shr_...` id) adds that shipping rate to orders with physical items; without it Stripe charges no shipping. Customer accounts with email and password (PBKDF2, D1 sessions, HttpOnly cookie); orders are linked to the signed-in customer.

## Asset plan

- Films (Kling 3.0 pro): leg A "The Pour" 15s, leg B "The Counter" 10s; storyboard and start stills via GPT Image 2.5.
- Menu drink stills (9, 3:4, one locked studio grade on forest green).
- Ambient audio: roaster hum and café murmur loops.
- Real plato.coffee photography: stores (Hermanus cottage, container store, Stellenbosch window, Garsfontein, De Waterkant, Paarl, Versus), interiors, academy, community, products, equipment, the real menu.
- Procedural WebGL: beans, drum glow, tray, espresso cups, takeaway cups with the real wordmark drawn onto the texture.
- Logo SVG, ō symbol favicon, OG card composed with the real wordmark.

## CTA inventory (each with its own interaction identity)

- `ScrollCue` (frame 01): a thin line that drains downward on loop, "Scroll the journey"
- `OriginChip` (frame 02): none (labels only)
- `PriceChip` (frame 12): pill that fills green from the left on hover, adds to cart with a bean-drop micro-animation
- `MenuFilterChip` (frame 13): outline chip; active state is a filled sage capsule that slides between chips
- `FindYourPlato` (frame 14): large ink capsule with a magnetic pull and an arrow that rotates 45 degrees
- `GetTheApp` (frame 14): text link with a drawing underline
- `QuickAdd` (product rail): circular plus that expands into "Add" on hover
- `CourseBook` (academy): row-wide hover; arrow travels to the right
- `CartTrigger`: bag icon with a count that bumps when an item lands
- `BurgerToggle`: two lines that morph into a cross
- `CheckoutSlab`: full-width green slab; label rolls on hover
- `StoreFinderPill`: persistent bottom-right pill, appears after frame 08
