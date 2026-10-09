// The in-store drinks menu (Platō menu board, June 2026). Prices in ZAR for S / M / L.

export type MenuSection = "Signature" | "Classic" | "Alternatives" | "Matcha & Tea" | "Freezos & Sodas" | "Extras";

export interface MenuItem {
  name: string;
  build: string;
  section: MenuSection;
  /** S, M, L. null when a size is not offered. */
  prices: [number | null, number | null, number | null];
}

export const MENU_SECTIONS: MenuSection[] = ["Signature", "Classic", "Alternatives", "Matcha & Tea", "Freezos & Sodas", "Extras"];

export const MENU: MenuItem[] = [
  { section: "Signature", name: "Aristotle", build: "3 Ristretto Shots + 180ml Micro Foam", prices: [48, null, null] },
  { section: "Signature", name: "Platō", build: "3 Ristretto Shots + 280ml Micro Foam", prices: [null, 54, null] },
  { section: "Signature", name: "Socrates", build: "4 Ristretto Shots + 410ml Micro Foam", prices: [null, null, 62] },
  { section: "Signature", name: "Hector", build: "4 Ristretto Shots + 160ml Micro Foam", prices: [56, null, null] },
  { section: "Signature", name: "Koleha", build: "4 Ristretto Shots + 260ml Micro Foam", prices: [null, 58, null] },
  { section: "Signature", name: "Ophelia", build: "Rooibos + White Hot Chocolate + Micro Foam", prices: [48, 54, 62] },
  { section: "Signature", name: "Thalia", build: "Micro Foam + Shot(s) Vanilla + Ristretto Shot(s) on Top", prices: [46, 53, 59] },
  { section: "Signature", name: "Athena", build: "Third Espresso + Third Water + Third Frothed Milk", prices: [40, 46, 50] },

  { section: "Classic", name: "Flat White", build: "2 Ristretto Shots + 200ml Micro Foam", prices: [42, null, null] },
  { section: "Classic", name: "Cortado", build: "2 Ristretto Shots + 130ml Micro Foam", prices: [38, null, null] },
  { section: "Classic", name: "Piccolo", build: "1 Espresso Shot + 150ml Micro Foam", prices: [33, null, null] },
  { section: "Classic", name: "Macchiato", build: "2 Ristretto Shots + Spot of Foam", prices: [30, null, null] },
  { section: "Classic", name: "Iced Americano", build: "Ristretto Shot(s) + Cold Water + Ice Cubes", prices: [null, 40, 45] },
  { section: "Classic", name: "Bombon", build: "Espresso Shot(s) + Condensed Milk + Micro Foam", prices: [45, 50, 56] },
  { section: "Classic", name: "Espresso", build: "2 Espresso Shots", prices: [27, null, null] },
  { section: "Classic", name: "Iced Latte", build: "Espresso Shot(s) + Cold Milk + Ice Cubes", prices: [null, 48, 54] },
  { section: "Classic", name: "Americano", build: "Ristretto Shot(s) + Hot Water", prices: [33, 38, 42] },
  { section: "Classic", name: "Short Black", build: "2 Ristretto Shots + 150ml Hot Water", prices: [29, null, null] },
  { section: "Classic", name: "Cappuccino", build: "Espresso Shot(s) + Frothed Milk", prices: [39, 46, 51] },
  { section: "Classic", name: "Latte", build: "Ristretto Shot(s) + Micro Foam", prices: [39, 46, 51] },
  { section: "Classic", name: "Latte Macchiato", build: "Micro Foam + Ristretto Shot(s) on Top", prices: [39, 46, 51] },
  { section: "Classic", name: "Babyccino", build: "150ml Micro Foam + Dash of Chocolate", prices: [16, null, null] },

  { section: "Alternatives", name: "Red Cappuccino", build: "Red Espresso Shot(s) + Frothed Milk", prices: [40, 46, 52] },
  { section: "Alternatives", name: "Chai Latte", build: "Spiced Chai + Micro Foam", prices: [42, 49, 55] },
  { section: "Alternatives", name: "Dirty Chai", build: "Spiced Chai + Espresso Shot(s) + Micro Foam", prices: [48, 56, 62] },
  { section: "Alternatives", name: "Flirty Chai", build: "Spiced Chai + Red Espresso Shot(s) + Micro Foam", prices: [48, 56, 62] },
  { section: "Alternatives", name: "Hot Choc", build: "Chocolate + Micro Foam", prices: [42, 49, 55] },
  { section: "Alternatives", name: "Dark Hot Choc", build: "Dark Hot Chocolate + Micro Foam", prices: [42, 49, 55] },
  { section: "Alternatives", name: "White Hot Choc", build: "White Hot Chocolate + Micro Foam", prices: [42, 49, 55] },
  { section: "Alternatives", name: "Mocha", build: "Espresso Shot(s) + Chocolate + Micro Foam", prices: [48, 56, 62] },
  { section: "Alternatives", name: "White Mocha", build: "Espresso Shot(s) + White Chocolate + Micro Foam", prices: [48, 56, 62] },
  { section: "Alternatives", name: "Caribbean Mocha", build: "Coconut + Chocolate + Micro Foam", prices: [42, 49, 55] },
  { section: "Alternatives", name: "Dirty Caribbean", build: "Coconut + Chocolate + Espresso Shot(s) + Micro Foam", prices: [48, 56, 62] },
  { section: "Alternatives", name: "Hot Ginger", build: "Ginger Syrup + Hot Water", prices: [30, 36, 42] },

  { section: "Matcha & Tea", name: "Matcha Latte", build: "Ceremonial Grade Matcha + Micro Foam", prices: [45, 56, 65] },
  { section: "Matcha & Tea", name: "Iced Matcha", build: "Ceremonial Grade Matcha + Cold Milk + Ice Cubes", prices: [null, 56, 65] },
  { section: "Matcha & Tea", name: "Iced Milktart Matcha", build: "Ceremonial Grade Matcha + Condensed Milk + Cold Milk + Cinnamon + Ice Cubes", prices: [null, 65, 75] },
  { section: "Matcha & Tea", name: "Matcha Freezo", build: "Ceremonial Grade Matcha + Milk + Blended Ice", prices: [null, 75, 85] },
  { section: "Matcha & Tea", name: "Tea", build: "Rooibos / Earl Grey / Egyptian Chamomile / Japanese Sencha / Lemon & Ginger / Forest Berry", prices: [32, 33, 34] },

  { section: "Freezos & Sodas", name: "Classic Freezo", build: "Coffee / Chocolate / White Chocolate / Chai", prices: [null, 58, 65] },
  { section: "Freezos & Sodas", name: "Signature Freezo", build: "Platō / Mocha / Caramel / Caribbean / Ophelia", prices: [null, 60, 67] },
  { section: "Freezos & Sodas", name: "Summer Freezo", build: "Strawberry / Mango / Passionfruit / Green Apple / Pomegranate / Watermelon / Gingerbeer / Lemonade", prices: [null, 56, 63] },
  { section: "Freezos & Sodas", name: "Protein Freezo", build: "Coffee / Caribbean Mocha (Whey Protein)", prices: [null, 69, null] },
  { section: "Freezos & Sodas", name: "Soda-Pop", build: "Passionfruit / Green Apple / Pomegranate / Watermelon / Gingerbeer / Lemonade", prices: [null, 44, 49] },

  { section: "Extras", name: "Extra Shot", build: "Espresso / Ristretto / Matcha", prices: [13, null, null] },
  { section: "Extras", name: "Milk Alternatives", build: "Almond / Soy / Oat / Macadamia / Coconut / Lactose-free (no charge)", prices: [11, 12, 14] },
  { section: "Extras", name: "Cream", build: "Pouring or Whipped", prices: [12, null, null] },
  { section: "Extras", name: "Flavours", build: "Hazelnut / Vanilla / Caramel / Salted Caramel / Butterscotch / Condensed Milk", prices: [10, 11, 12] },
  { section: "Extras", name: "Creatine / Collagen", build: "USN x Platō Brewboost, 5g sachet", prices: [25, null, null] },
];

/** Frame 13: the signature gallery (tall cards). Filters map to menu sections. */
export const MENU_FEATURE: {
  name: string;
  build: string;
  note: string;
  filter: "Signature" | "Classic" | "Alternatives" | "Matcha" | "Freezo";
  image: string;
  price: string;
}[] = [
  { name: "Aristotle", build: "3 ristretto shots, 180ml micro foam", note: "Short, dense, sweet. Three shots in a small cup.", filter: "Signature", image: "/assets/drinks/aristotle.webp", price: "R48" },
  { name: "Platō", build: "3 ristretto shots, 280ml micro foam", note: "The house signature: three shots, a medium cup.", filter: "Signature", image: "/assets/drinks/plato.webp", price: "R54" },
  { name: "Socrates", build: "4 ristretto shots, 410ml micro foam", note: "For the long morning and the longer conversation.", filter: "Signature", image: "/assets/drinks/socrates.webp", price: "R62" },
  { name: "Hector", build: "4 ristretto shots, 160ml micro foam", note: "Four shots, very little milk. Strong opinions welcome.", filter: "Signature", image: "/assets/drinks/hector.webp", price: "R56" },
  { name: "Ophelia", build: "Rooibos, white hot chocolate, micro foam", note: "A South African cup with no coffee at all.", filter: "Signature", image: "/assets/drinks/ophelia.webp", price: "from R48" },
  { name: "Thalia", build: "Micro foam, vanilla, ristretto on top", note: "Layered, sweet, and poured last.", filter: "Signature", image: "/assets/drinks/thalia.webp", price: "from R46" },
  { name: "Dirty Chai", build: "Spiced chai, espresso, micro foam", note: "Chai with a shot of courage.", filter: "Alternatives", image: "/assets/drinks/dirtychai.webp", price: "from R48" },
  { name: "Iced Matcha", build: "PerfectTed ceremonial matcha, cold milk, ice", note: "Official South African partner of PerfectTed.", filter: "Matcha", image: "/assets/drinks/matcha.webp", price: "from R56" },
  { name: "Signature Freezo", build: "Platō, Mocha, Caramel, Caribbean or Ophelia", note: "The Freezo one reviewer calls the best in town.", filter: "Freezo", image: "/assets/drinks/freezo.webp", price: "from R60" },
];
