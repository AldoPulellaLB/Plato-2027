// PLATO catalogue: curated from the current plato.coffee range. Prices in ZAR cents.
export type Category = "coffee" | "pods" | "instant" | "matcha" | "merch" | "equipment" | "academy";

export interface Variant {
  id: string;
  title: string;
  price: number;
  /** ISO date for dated items (Academy courses). Past dates are not sold. */
  date?: string;
}

export interface Product {
  handle: string;
  title: string;
  category: Category;
  description: string;
  images: string[];
  variants: Variant[];
  optionName: string | null;
}

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "coffee", label: "Coffee", blurb: "Medium roast Arabica, whole bean or ground to order." },
  { id: "pods", label: "Pods", blurb: "Compostable, Nespresso compatible, 6g of fresh coffee each." },
  { id: "instant", label: "Instant & drip", blurb: "Café drinks at home, in a spoonful or a single bag." },
  { id: "matcha", label: "Matcha", blurb: "PerfectTed ceremonial matcha. Platō is the official South African partner." },
  { id: "merch", label: "Wear", blurb: "Heavyweight tees, crews and caps from the counter." },
  { id: "equipment", label: "Equipment", blurb: "Rocket espresso machines and Eureka grinders for a café bar at home." },
  { id: "academy", label: "Academy", blurb: "Hands-on courses from home brewing to training as a café barista." },
];

export const PRODUCTS: Product[] = [
  {
    "handle": "plato-house-blend-250g",
    "title": "House Blend 250g",
    "category": "coffee",
    "description": "Introducing our Medium Roast, 100% Arabica Coffee Blend, a symphony of flavours sourced from the lush coffee regions of Tanzania, Guatemala, and Brazil. Crafted with unparalleled dedication, this blend offers a sensory journey that transcends the ordinary and delights the palate with its captivating sweetness. Grown at optimal altitudes and carefully handpicked, the Arabica beans from Tanzania bring a vibrant brightness to the cup. As you take your first sip, you'll be greeted by the delicate notes of ripe berries and a subtle floral aroma reminiscent of the fertile Tanzanian highlands. With their distinct terroir, the Guatemalan beans contribute a rich complexity to the blend.",
    "images": [
      "/assets/products/plato-house-blend-250g-1.jpg",
      "/assets/products/plato-house-blend-250g-2.jpg"
    ],
    "variants": [
      {
        "id": "50039353639195",
        "title": "Whole Bean",
        "price": 17000
      },
      {
        "id": "50039353671963",
        "title": "Espresso Grind",
        "price": 17000
      },
      {
        "id": "50039353704731",
        "title": "Filter Grind",
        "price": 17000
      }
    ],
    "optionName": "Grind"
  },
  {
    "handle": "plato-house-blend",
    "title": "House Blend 1kg",
    "category": "coffee",
    "description": "Introducing our Medium Roast, 100% Arabica Coffee Blend, a symphony of flavours sourced from the lush coffee regions of Tanzania, Guatemala, and Brazil. Crafted with unparalleled dedication, this blend offers a sensory journey that transcends the ordinary and delights the palate with its captivating sweetness. Grown at optimal altitudes and carefully handpicked, the Arabica beans from Tanzania bring a vibrant brightness to the cup. As you take your first sip, you'll be greeted by the delicate notes of ripe berries and a subtle floral aroma reminiscent of the fertile Tanzanian highlands. With their distinct terroir, the Guatemalan beans contribute a rich complexity to the blend.",
    "images": [
      "/assets/products/plato-house-blend-1.jpg"
    ],
    "variants": [
      {
        "id": "50061258195227",
        "title": "Whole Bean",
        "price": 49000
      },
      {
        "id": "50061258227995",
        "title": "Espresso Grind",
        "price": 49000
      },
      {
        "id": "50061258260763",
        "title": "Filter Grind",
        "price": 49000
      }
    ],
    "optionName": "Grind"
  },
  {
    "handle": "decaf-plato-house-blend-250g",
    "title": "Decaf House Blend 250g",
    "category": "coffee",
    "description": "Introducing our Medium Roast, 100% Arabica Coffee Blend, a symphony of flavours sourced from the lush coffee regions of Tanzania, Guatemala, and Brazil. Crafted with unparalleled dedication, this blend offers a sensory journey that transcends the ordinary and delights the palate with its captivating sweetness. Grown at optimal altitudes and carefully handpicked, the Arabica beans from Tanzania bring a vibrant brightness to the cup. As you take your first sip, you'll be greeted by the delicate notes of ripe berries and a subtle floral aroma reminiscent of the fertile Tanzanian highlands. With their distinct terroir, the Guatemalan beans contribute a rich complexity to the blend.",
    "images": [
      "/assets/products/decaf-plato-house-blend-250g-1.jpg"
    ],
    "variants": [
      {
        "id": "50039348003099",
        "title": "Whole Bean",
        "price": 19000
      },
      {
        "id": "50039348035867",
        "title": "Espresso Grind",
        "price": 19000
      },
      {
        "id": "50039348068635",
        "title": "Filter Grind",
        "price": 19000
      }
    ],
    "optionName": "Grind"
  },
  {
    "handle": "decaf-plato-house-blend-1kg",
    "title": "Decaf House Blend 1kg",
    "category": "coffee",
    "description": "Introducing our Medium Roast, 100% Arabica Coffee Blend, a symphony of flavours sourced from the lush coffee regions of Tanzania, Guatemala, and Brazil. Crafted with unparalleled dedication, this blend offers a sensory journey that transcends the ordinary and delights the palate with its captivating sweetness. Grown at optimal altitudes and carefully handpicked, the Arabica beans from Tanzania bring a vibrant brightness to the cup. As you take your first sip, you'll be greeted by the delicate notes of ripe berries and a subtle floral aroma reminiscent of the fertile Tanzanian highlands. With their distinct terroir, the Guatemalan beans contribute a rich complexity to the blend.",
    "images": [
      "/assets/products/decaf-plato-house-blend-1kg-1.jpg"
    ],
    "variants": [
      {
        "id": "50061254820123",
        "title": "Whole Bean",
        "price": 60000
      },
      {
        "id": "50061254852891",
        "title": "Espresso Grind",
        "price": 60000
      },
      {
        "id": "50061254885659",
        "title": "Filter Grind",
        "price": 60000
      }
    ],
    "optionName": "Grind"
  },
  {
    "handle": "10-x-1kg-plato-house-blend",
    "title": "House Blend Café Pack (10 x 1kg)",
    "category": "coffee",
    "description": "Introducing our Medium Roast, 100% Arabica Coffee Blend, a symphony of flavours sourced from the lush coffee regions of Tanzania, Guatemala, and Brazil. Crafted with unparalleled dedication, this blend offers a sensory journey that transcends the ordinary and delights the palate with its captivating sweetness. Grown at optimal altitudes and carefully handpicked, the Arabica beans from Tanzania bring a vibrant brightness to the cup. As you take your first sip, you'll be greeted by the delicate notes of ripe berries and a subtle floral aroma reminiscent of the fertile Tanzanian highlands. With their distinct terroir, the Guatemalan beans contribute a rich complexity to the blend.",
    "images": [
      "/assets/products/10-x-1kg-plato-house-blend-1.jpg"
    ],
    "variants": [
      {
        "id": "51020866158875",
        "title": "Whole Bean",
        "price": 465500
      },
      {
        "id": "51020866191643",
        "title": "Espresso Grind",
        "price": 465500
      },
      {
        "id": "51020866224411",
        "title": "Filter Grind",
        "price": 465500
      }
    ],
    "optionName": "Grind"
  },
  {
    "handle": "plato-coffee-pods-pack-of-10",
    "title": "Platō Coffee Pods (Pack of 10 Nespresso Compatible Pods)",
    "category": "pods",
    "description": "Indulge in the exclusive luxury of Platō Coffee Pods. With a partnership with @4wks_coffee, you can enjoy the smooth taste of our eco-friendly, compostable pods. 100% Nespresso Machine compatible for a convenient and premium coffee experience. Start your morning ritual with Platō. Important Information Slow Extraction . In comparison to Aluminium Nespresso(r) capsules, our Platō pods are different. Here are some reasons why: Each capsule is filled with 6.0g of freshly roasted coffee, in comparison to the 5.4g you would find in a Nespresso(r) capsule.",
    "images": [
      "/assets/products/plato-coffee-pods-pack-of-10-1.jpg",
      "/assets/products/plato-coffee-pods-pack-of-10-2.jpg",
      "/assets/products/plato-coffee-pods-pack-of-10-3.jpg"
    ],
    "variants": [
      {
        "id": "49599567954203",
        "title": "Default Title",
        "price": 11500
      }
    ],
    "optionName": null
  },
  {
    "handle": "decaf-plato-coffee-pods-pack-of-10-nespresso-compatible-pods",
    "title": "Decaf Platō Coffee Pods (Pack of 10 Nespresso Compatible Pods)",
    "category": "pods",
    "description": "Indulge in the exclusive luxury of Platō Decaf Coffee Pods. With a partnership with @4wks_coffee, you can enjoy the smooth taste of our eco-friendly, compostable pods. 100% Nespresso Machine compatible for a convenient and premium decaf coffee experience. Start your morning ritual with Platō. Important Information Slow Extraction . In comparison to Aluminium Nespresso capsules, our Platō decaf coffee pods are different. Here are some reasons why: Each capsule is filled with 6.0g of freshly roasted decaf coffee, in comparison to the 5.4g you would find in a Nespresso capsule.",
    "images": [
      "/assets/products/decaf-plato-coffee-pods-pack-of-10-nespresso-compatible-pods-1.jpg"
    ],
    "variants": [
      {
        "id": "51316782170395",
        "title": "Default Title",
        "price": 12000
      }
    ],
    "optionName": null
  },
  {
    "handle": "plato-coffee-pods-box-of-50",
    "title": "Platō Coffee Pods (Box of 50)",
    "category": "pods",
    "description": "Discover the rich taste of Platō Coffee Pods. In partnership with @4wks_coffee, we bring you the smooth, balanced flavour of Platō’s signature roast in biodegradable pods. Compatible with all Nespresso® machines, they offer a simple, sustainable way to enjoy exceptional coffee every day. Begin your ritual with Platō. This carton contains 50 pods . Important Information Slow Extraction . In comparison to Aluminium Nespresso(r) capsules, our Platō pods are different. Here are some reasons why: Each capsule is filled with 6.0g of freshly roasted coffee, in comparison to the 5.4g you would find in a Nespresso(r) capsule.",
    "images": [
      "/assets/products/plato-coffee-pods-box-of-50-1.jpg"
    ],
    "variants": [
      {
        "id": "51075996057883",
        "title": "Default Title",
        "price": 47500
      }
    ],
    "optionName": null
  },
  {
    "handle": "plato-coffee-pods-carton-12-sleeves",
    "title": "Platō Coffee Pods Carton (12 Sleeves of 10 Pods)",
    "category": "pods",
    "description": "Experience the opulent indulgence of Platō Coffee Pods. Our partnership with @4wks_coffee allows you to savor the velvety flavor of our environmentally-friendly, biodegradable pods. 100% compatible with Nespresso Machines for a sophisticated and lavish coffee experience. Begin your daily ritual with Platō. This carton contains 12 sleeves of 10 pods making a total of 120 pods. Important Information Slow Extraction . In comparison to Aluminium Nespresso(r) capsules, our Platō pods are different. Here are some reasons why: Each capsule is filled with 6.0g of freshly roasted coffee, in comparison to the 5.4g you would find in a Nespresso(r) capsule.",
    "images": [
      "/assets/products/plato-coffee-pods-carton-12-sleeves-1.jpg",
      "/assets/products/plato-coffee-pods-carton-12-sleeves-2.jpg",
      "/assets/products/plato-coffee-pods-carton-12-sleeves-3.jpg"
    ],
    "variants": [
      {
        "id": "49601858142491",
        "title": "Default Title",
        "price": 126500
      }
    ],
    "optionName": null
  },
  {
    "handle": "4wks-coffee-drip-bags-box",
    "title": "4WKS Coffee Drip Bags (Box of 10)",
    "category": "instant",
    "description": "A Box of 10 Compostable Coffee Drip Bags - Single Origin Light Roast - with balanced notes. Enjoy with milk or black. Tasting Notes Blueberry jam, milk chocolate, honey.",
    "images": [
      "/assets/products/4wks-coffee-drip-bags-box-1.jpg",
      "/assets/products/4wks-coffee-drip-bags-box-2.jpg",
      "/assets/products/4wks-coffee-drip-bags-box-3.jpg"
    ],
    "variants": [
      {
        "id": "51316821426459",
        "title": "Default Title",
        "price": 24000
      }
    ],
    "optionName": null
  },
  {
    "handle": "4wks-coffee-drip-bags-singles",
    "title": "4WKS Coffee Drip Bags (Singles)",
    "category": "instant",
    "description": "Discover the convenience of premium single-origin coffee with our 4WKS Drip Bags. An individually packaged light roast bag, crafted for effortless brewing anywhere. Experience a beautifully balanced cup featuring delicate notes of blueberry jam, milk chocolate, and honey, whether you prefer it with milk or black. Perfect for coffee lovers seeking quality without compromise, this compostable drip bag deliver café-quality results in minutes. Elevate your daily ritual with coffee that tastes as good as it feels responsible.",
    "images": [
      "/assets/products/4wks-coffee-drip-bags-singles-1.jpg",
      "/assets/products/4wks-coffee-drip-bags-singles-2.jpg",
      "/assets/products/4wks-coffee-drip-bags-singles-3.jpg"
    ],
    "variants": [
      {
        "id": "51316817461531",
        "title": "Default Title",
        "price": 2400
      }
    ],
    "optionName": null
  },
  {
    "handle": "caribbean-mocha",
    "title": "Caribbean Mocha",
    "category": "instant",
    "description": "A tropical twist on a coffee classic. The Platō Caribbean Mocha blends rich, velvety chocolate with the smooth essence of coconut for a decadent escape in every sip. Whether you enjoy it as a creamy hot mocha or an ice-cold freezo, this indulgent blend is perfect for those who love their coffee with a little extra flair. Preparation Instructions: 1. Add 4 - 5 heaped teaspoons (25g) of powder into a cup. 2. Add 40ml hot milk & mix into a paste. 3. Add a single or double shot of espresso 4. Top up with 160ml hot milk & stir well. Product Specifications: Weight: 250g Allergens: Contains cow’s milk. Packed in a facility that processes gluten.",
    "images": [
      "/assets/products/caribbean-mocha-1.jpg"
    ],
    "variants": [
      {
        "id": "49938478301467",
        "title": "Default Title",
        "price": 10000
      }
    ],
    "optionName": null
  },
  {
    "handle": "chai-latte",
    "title": "Chai Latté",
    "category": "instant",
    "description": "Spiced, creamy, and effortlessly comforting, our Platō Instant Chai Latte brings a touch of luxury to your cup. With its perfect balance of warmth and sweetness, this velvety blend is made for slow mornings, afternoon pick-me-ups, or cozy evenings. Preparation Instructions: 1. Add 4 - 5 heaped teaspoons (25g) of chai powder into a cup. 2. Add 40ml hot milk & mix into a paste. 3. Top up with 160ml hot milk & stir well. Product Specifications: Weight: 250g Allergens: Contains cow’s milk. Packed in a facility that processes gluten.",
    "images": [
      "/assets/products/chai-latte-1.jpg"
    ],
    "variants": [
      {
        "id": "49938480955675",
        "title": "Default Title",
        "price": 9500
      }
    ],
    "optionName": null
  },
  {
    "handle": "hot-chocolate",
    "title": "Hot Chocolate",
    "category": "instant",
    "description": "Indulgence made simple. Our Platō Instant Hot Chocolate is crafted for rich, velvety smoothness in every sip. Just add milk or hot water for a luxuriously creamy chocolate experience. Whether you're cozying up at home, taking a break at the office, or sipping fireside under the stars, this is your perfect chocolate fix. Preparation Instructions: 1. Scoop 3-4 heaped teaspoons (20g) into a mug. 2. Add 40ml hot milk (or water) & mix into a paste. 3. Top up with 160ml hot milk (or water) & stir well. Product Specifications: Weight: 250g Allergens: Packed in a facility that processes cow’s milk & gluten.",
    "images": [
      "/assets/products/hot-chocolate-1.jpg"
    ],
    "variants": [
      {
        "id": "49938483577115",
        "title": "Default Title",
        "price": 9500
      }
    ],
    "optionName": null
  },
  {
    "handle": "premium-instant-drinks-variety-pack",
    "title": "Premium Instant Drinks - Variety Pack",
    "category": "instant",
    "description": "Easy to prepare. Effortlessly delicious. Experience café-quality indulgence at home with the Platō Premium Instant Drinks . Featuring one of each of our premium blends, this selection is perfect for those who appreciate rich flavours, effortless convenience, and a touch of everyday luxury. Caribbean Mocha - A tropical twist on a coffee classic, blending velvety chocolate with smooth coconut for a decadent escape. Enjoy it hot or as an ice-cold freezo. Chai Latté - Spiced, creamy, and perfectly balanced, this comforting blend is ideal for slow mornings, afternoon pick-me-ups, and cosy evenings. Hot Chocolate - Pure indulgence in every sip.",
    "images": [
      "/assets/products/premium-instant-drinks-variety-pack-1.jpg"
    ],
    "variants": [
      {
        "id": "49962585293083",
        "title": "Default Title",
        "price": 27900
      }
    ],
    "optionName": null
  },
  {
    "handle": "perfectted-ceremonial-matcha-250g",
    "title": "PerfectTed Ceremonial Grade Matcha 250g",
    "category": "matcha",
    "description": "Ceremonial grade Japanese matcha from PerfectTed, the matcha behind every Platō matcha latte. Whisk it hot, shake it over ice, or blend it into a Freezo. Platō is the official South African partner of PerfectTed.",
    "images": [
      "/assets/products/perfectted-og-matcha.webp"
    ],
    "variants": [
      {
        "id": "pt-og-250",
        "title": "Default Title",
        "price": 172500
      }
    ],
    "optionName": null
  },
  {
    "handle": "perfectted-blueberry-matcha-75g",
    "title": "PerfectTed Blueberry Matcha 75g",
    "category": "matcha",
    "description": "Ceremonial grade matcha with natural blueberry. Made for iced matcha lattes at home.",
    "images": [
      "/assets/products/perfectted-blueberry.webp"
    ],
    "variants": [
      {
        "id": "pt-blueberry-75",
        "title": "Default Title",
        "price": 28900
      }
    ],
    "optionName": null
  },
  {
    "handle": "perfectted-pistachio-matcha-75g",
    "title": "PerfectTed Pistachio Matcha 75g",
    "category": "matcha",
    "description": "Ceremonial grade matcha with a soft, nutty pistachio finish.",
    "images": [
      "/assets/products/perfectted-pistachio.webp"
    ],
    "variants": [
      {
        "id": "pt-pistachio-75",
        "title": "Default Title",
        "price": 28900
      }
    ],
    "optionName": null
  },
  {
    "handle": "perfectted-strawberry-matcha-75g",
    "title": "PerfectTed Strawberry Matcha 75g",
    "category": "matcha",
    "description": "Ceremonial grade matcha with natural strawberry. Pour over cold milk and ice.",
    "images": [
      "/assets/products/perfectted-strawberry.webp"
    ],
    "variants": [
      {
        "id": "pt-strawberry-75",
        "title": "Default Title",
        "price": 28900
      }
    ],
    "optionName": null
  },
  {
    "handle": "perfectted-vanilla-matcha-75g",
    "title": "PerfectTed Vanilla Matcha 75g",
    "category": "matcha",
    "description": "Ceremonial grade matcha with smooth vanilla. Award-winning, and our favourite hot.",
    "images": [
      "/assets/products/perfectted-vanilla.webp"
    ],
    "variants": [
      {
        "id": "pt-vanilla-75",
        "title": "Default Title",
        "price": 28900
      }
    ],
    "optionName": null
  },
  {
    "handle": "plato-signature-t-shirt",
    "title": "Platō Signature T-Shirt",
    "category": "merch",
    "description": "The Platō Signature T-Shirt is a heavyweight 200gsm unisex tee made from 100% cotton. Locally manufactured with a special finish for an extra soft feel. It features a small Platō logo on the front and a bold Platō face print on the back. Product Features: Heavyweight 200gsm fabric for durability Unisex 100% cotton with a special finish for comfort Locally manufactured for quality craftsmanship Available in White, sizes XS to 3XL",
    "images": [
      "/assets/products/plato-signature-t-shirt-1.jpg",
      "/assets/products/plato-signature-t-shirt-2.jpg",
      "/assets/products/plato-signature-t-shirt-3.jpg"
    ],
    "variants": [
      {
        "id": "50016165757211",
        "title": "S",
        "price": 45000
      },
      {
        "id": "50016165789979",
        "title": "M",
        "price": 45000
      },
      {
        "id": "50016165822747",
        "title": "L",
        "price": 45000
      },
      {
        "id": "50016165855515",
        "title": "XL",
        "price": 45000
      },
      {
        "id": "50016165888283",
        "title": "2XL",
        "price": 45000
      }
    ],
    "optionName": "Size"
  },
  {
    "handle": "the-plato-classic-crew",
    "title": "The Platō Classic Crew",
    "category": "merch",
    "description": "The Platō Classic Crew is a modern staple made for comfort, character, and everyday wear. Locally manufactured and custom dyed in our signature burgundy, it features a minimalist print of the Platō character on the chest,  understated, thoughtful, and unmistakably Platō. Made from 100% combed cotton brushed fleece (240gsm), it’s soft on the inside, structured on the outside, and ideal for layering through the seasons. Product Features: 100% combed cotton brushed fleece Custom-dyed in Platō Burgundy Crew neck collar Regular fit Raglan sleeves for natural movement Ribbed waistband & cuffs for a clean finish Unisex Locally manufactured for quality & craftsmanship Available in sizes XS to 2XL",
    "images": [
      "/assets/products/the-plato-classic-crew-1.jpg",
      "/assets/products/the-plato-classic-crew-2.jpg",
      "/assets/products/the-plato-classic-crew-3.jpg"
    ],
    "variants": [
      {
        "id": "50500449173787",
        "title": "XS",
        "price": 59900
      },
      {
        "id": "50500449206555",
        "title": "S",
        "price": 59900
      },
      {
        "id": "50500449239323",
        "title": "M",
        "price": 59900
      },
      {
        "id": "50500449272091",
        "title": "L",
        "price": 59900
      },
      {
        "id": "50500449304859",
        "title": "XL",
        "price": 59900
      },
      {
        "id": "50500449337627",
        "title": "2XL",
        "price": 59900
      }
    ],
    "optionName": "Size"
  },
  {
    "handle": "plato-logo-cap",
    "title": "Platō Logo Cap",
    "category": "merch",
    "description": "The Platō Washed Denim Cap is the perfect finishing touch for any outfit. Featuring an embroided Platō logo on the front, this cap blends understated style with a relaxed, worn-in feel. Whether you're out for a coffee run, hitting the trails, or just keeping it laid-back, it’s designed for everyday wear. Available in Maroon, Grey, and Olive, it features a curved brim and an adjustable strap for a comfortable, custom fit, wherever life takes you. Product Features: Soft, washed denim fabric for a lived-in feel Adjustable strap for a custom fit Timeless unstructured design for effortless wear One size fits all",
    "images": [
      "/assets/products/plato-logo-cap-1.jpg",
      "/assets/products/plato-logo-cap-2.jpg",
      "/assets/products/plato-logo-cap-3.jpg"
    ],
    "variants": [
      {
        "id": "50015420481819",
        "title": "Gray",
        "price": 29500
      },
      {
        "id": "50015420514587",
        "title": "Maroon",
        "price": 29500
      },
      {
        "id": "50015420547355",
        "title": "Olive",
        "price": 29500
      }
    ],
    "optionName": "Colour"
  },
  {
    "handle": "plato-double-shot-or-nothing-cap",
    "title": "Platō Double Shot or Nothing Cap",
    "category": "merch",
    "description": "If you know, you know. The Double Shot or Nothing washed denim cap is a cheeky nod to Platō’s unapologetic commitment to double-shot espresso, every time. Perfect for caffeine-fuelled mornings, café hangs, and everything in between. Available exclusively in olive, with a curved brim and adjustable strap for a comfy, custom fit. Product Features: Soft, washed denim fabric for a lived-in feel Adjustable strap for a custom fit Timeless unstructured design for effortless wear One size fits all",
    "images": [
      "/assets/products/plato-double-shot-or-nothing-cap-1.jpg",
      "/assets/products/plato-double-shot-or-nothing-cap-2.jpg",
      "/assets/products/plato-double-shot-or-nothing-cap-3.jpg"
    ],
    "variants": [
      {
        "id": "50015421661467",
        "title": "Default Title",
        "price": 29500
      }
    ],
    "optionName": null
  },
  {
    "handle": "plato-cycling-shirts",
    "title": "Platō Pro Cycling Jersey",
    "category": "merch",
    "description": "Performance meets comfort with the Platō Pro Cycling Jersey. This relaxed-fit jersey is designed with a strategic combination of lightweight, breathable fabrics to keep you feeling fresh in all conditions. With mesh side panels for optimal airflow, an elastic hem gripper to prevent ride-up, and three reinforced back pockets for your essentials, this jersey is built for both functionality and style. Whether you're taking on long-distance rides or enjoying a casual weekend spin, it delivers the perfect balance of ventilation, comfort, and practicality.",
    "images": [
      "/assets/products/plato-cycling-shirts-1.jpg",
      "/assets/products/plato-cycling-shirts-2.jpg",
      "/assets/products/plato-cycling-shirts-3.jpg"
    ],
    "variants": [
      {
        "id": "49999968338203",
        "title": "S",
        "price": 125000
      },
      {
        "id": "49999968370971",
        "title": "M",
        "price": 125000
      },
      {
        "id": "49999968403739",
        "title": "L",
        "price": 125000
      },
      {
        "id": "49999968436507",
        "title": "XL",
        "price": 125000
      },
      {
        "id": "49999968469275",
        "title": "2XL",
        "price": 125000
      }
    ],
    "optionName": "Size"
  },
  {
    "handle": "rocket-appartamento",
    "title": "Rocket Appartamento",
    "category": "equipment",
    "description": "Indulge in the ultimate home or office coffee experience with the ROCKET Appartamento. With its sleek design and expert engineering, this compact espresso machine elevates your daily ritual. Trust in its top-quality components and effortless maintenance, making it the perfect addition to your kitchen. SPECIFICATIONS PID PRESSURE CONTROL: No SHOT TIMER: No TOTAL BOILER CAPACITY: 1.80 l Water Feed - Hard Plumbing: No Water Feed - Reservoir: Yes Wattage: 220 - 240V | 50/60Hz | 1350W - 115V | 60Hz | 1300W Dimensions: 274W × 425D × 360H mm Weight: 20 kg",
    "images": [
      "/assets/products/rocket-appartamento-1.jpg",
      "/assets/products/rocket-appartamento-2.jpg",
      "/assets/products/rocket-appartamento-3.jpg"
    ],
    "variants": [
      {
        "id": "49600290324763",
        "title": "White",
        "price": 4050300
      },
      {
        "id": "49600290357531",
        "title": "Copper",
        "price": 4050300
      },
      {
        "id": "49600290390299",
        "title": "Black & Copper",
        "price": 4197400
      },
      {
        "id": "49600290423067",
        "title": "Black & White",
        "price": 4197400
      }
    ],
    "optionName": "Color"
  },
  {
    "handle": "rocket-cronometro-giotto-r",
    "title": "Rocket Cronometro Giotto R",
    "category": "equipment",
    "description": "Indulge in the ultimate espresso experience with the ROCKET Cronometro Giotto R. Featuring advanced technology from our commercial machines, this compact yet powerful espresso machine offers precise temperature control, a digital shot timer, and quiet yet robust performance. Choose between drawing water from the reservoir or directly from the water supply. Available in two luxurious body styles.",
    "images": [
      "/assets/products/rocket-cronometro-giotto-r-1.jpg",
      "/assets/products/rocket-cronometro-giotto-r-2.jpg"
    ],
    "variants": [
      {
        "id": "49600294945051",
        "title": "Default Title",
        "price": 5347500
      }
    ],
    "optionName": null
  },
  {
    "handle": "rocket-cronometro-mozzafiato-r",
    "title": "Rocket Cronometro Mozzafiato R",
    "category": "equipment",
    "description": "Elevate your espresso experience with the ROCKET Cronometro Mozzafiato R. Inspired by the Rocket Commercial Range, this beautifully designed machine boasts cutting-edge technology such as a digital shot timer, PID temperature control, and insulated boilers. The 9mm boiler end-plates and quiet rotary pump add even more precision. With two body styles and the option for a direct water supply, this is the ultimate statement piece for your kitchen.",
    "images": [
      "/assets/products/rocket-cronometro-mozzafiato-r-1.jpg",
      "/assets/products/rocket-cronometro-mozzafiato-r-2.jpg",
      "/assets/products/rocket-cronometro-mozzafiato-r-3.jpg"
    ],
    "variants": [
      {
        "id": "49600297533723",
        "title": "Default Title",
        "price": 5531500
      }
    ],
    "optionName": null
  },
  {
    "handle": "eureka-mignon-specialita-espresso-grinder",
    "title": "Eureka Mignon Specialita Espresso Grinder",
    "category": "equipment",
    "description": "Introducing the EUREKA Mignon Specialita Espresso Grinder, a perfect blend of exquisite Italian design, flawless functionality, and superior quality. With near-silent operation and stepless micrometric regulation, enjoy precise and top-quality grinding. The ACE anti-clumping system ensures a smooth coffee outflow, while the 55mm burrs deliver exceptional performance and speed. A touch screen with programmable settings adds the perfect touch of luxury to your coffee experience. Elevate your coffee game with the Eureka Mignon Specialita.",
    "images": [
      "/assets/products/eureka-mignon-specialita-espresso-grinder-1.jpg",
      "/assets/products/eureka-mignon-specialita-espresso-grinder-2.jpg",
      "/assets/products/eureka-mignon-specialita-espresso-grinder-3.jpg"
    ],
    "variants": [
      {
        "id": "49602216329499",
        "title": "Matt Black 16CL",
        "price": 1242000
      },
      {
        "id": "49602216362267",
        "title": "White",
        "price": 1242000
      },
      {
        "id": "49602216395035",
        "title": "Chrome",
        "price": 1328300
      },
      {
        "id": "49602216427803",
        "title": "Matt Black",
        "price": 1242000
      }
    ],
    "optionName": "Color"
  },
  {
    "handle": "eureka-mignon-oro-xl-65-espress-grinder",
    "title": "Eureka Mignon ORO XL 65 Espresso Grinder",
    "category": "equipment",
    "description": "Take your home barista game to the next level with the EUREKA Mignon ORO XL 65 Espresso Grinder. With impeccable build quality, unparalleled grind consistency, and additional features, this grinder is sure to impress even the most discerning coffee lovers. Made by a renowned specialist manufacturer, it's no wonder this grinder has become our most popular choice for espresso enthusiasts. Elevate your coffee experience with the Mignon XL 65. FEATURES Premium grinding quality , thanks to patented Pure Diamond burrs (65 mm) that preserve the optimal burrs sharpness longer than any others and ensure a more steady granulometry over time.",
    "images": [
      "/assets/products/eureka-mignon-oro-xl-65-espress-grinder-1.jpg",
      "/assets/products/eureka-mignon-oro-xl-65-espress-grinder-2.jpg"
    ],
    "variants": [
      {
        "id": "49602204434715",
        "title": "Black",
        "price": 1909000
      },
      {
        "id": "49602204467483",
        "title": "Chrome",
        "price": 1968800
      }
    ],
    "optionName": "Color"
  },
  {
    "handle": "barista-basics",
    "title": "Barista Basics",
    "category": "academy",
    "description": "Barista 101 at The Academy by Platō is a hands-on introduction to the craft of coffee, designed for anyone who is curious, coffee-obsessed, or simply keen to learn something new. No experience is needed - just a deep sense of curiosity of how to make coffee well. In this interactive session, we focus on the two foundations of every café-quality drink: pulling a tasty espresso and steaming milk well . You’ll learn the essential techniques behind consistent espresso extraction and discover why taste is one of the most powerful tools in your barista toolkit in mastering quality. We then turn our attention to milk, covering the fundamentals of milk composition, temperature, and texture.",
    "images": [
      "/assets/products/barista-basics-1.jpg"
    ],
    "variants": [
      {
        "id": "52270422655259",
        "title": "26 June 2026 | 09:00 - 15:00",
        "price": 235000,
        "date": "2026-06-26"
      },
      {
        "id": "52389592957211",
        "title": "4 August 2026 | 09:00 - 15:00",
        "price": 235000,
        "date": "2026-08-04"
      }
    ],
    "optionName": "Date"
  },
  {
    "handle": "home-brewing-filter-copy",
    "title": "Home Brewing (Espresso)",
    "category": "academy",
    "description": "Home Brewing (Espresso) at The Academy by Platō is a practical, hands-on course designed to help you make better coffee at home. We’ll cover the essentials of espresso extraction and milk steaming, giving you a solid understanding of what to do when the coffee doesn’t taste quite right. The session is relaxed and interactive, with plenty of hands-on practice. You’re welcome to bring your own home espresso setup, and our coffee professional will help you apply what you learn to your equipment. You’ll leave with practical skills, a clearer understanding of espresso and milk, and a bag of coffee to take home so you can keep practising.",
    "images": [
      "/assets/products/home-brewing-filter-copy-1.jpg"
    ],
    "variants": [
      {
        "id": "52703596904731",
        "title": "21 August 2026 | 13:00 - 15:30",
        "price": 65000,
        "date": "2026-08-21"
      },
      {
        "id": "54056269480219",
        "title": "13 October 2026 | 13:00 - 15:00",
        "price": 65000,
        "date": "2026-10-13"
      }
    ],
    "optionName": "Date"
  },
  {
    "handle": "home-brewing-filter",
    "title": "Home Brewing (Filter)",
    "category": "academy",
    "description": "Home Brewing (Filter) at The Academy by Platō is an intentionally designed alternative brewing experience that helps you master key brewing variables to achieve optimal extraction and flavour. We explore each of the seven variables in a purposeful, hands on way, evaluating the impact of each on the overall taste experience. This course is fun, practical, and informative. Whether you are a seasoned professional or just starting your journey into drip coffee, this is the class for you. Venue 40 Canterbury Str, District Six, Cape Town",
    "images": [
      "/assets/products/home-brewing-filter-1.jpg"
    ],
    "variants": [
      {
        "id": "52389598822683",
        "title": "28 August 2026 | 13:30 - 15:30",
        "price": 55000,
        "date": "2026-08-28"
      },
      {
        "id": "54056268202267",
        "title": "13 October 2026 | 09:00 - 11:30",
        "price": 55000,
        "date": "2026-10-13"
      }
    ],
    "optionName": "Date"
  },
  {
    "handle": "sensory-evaluation-and-tasting",
    "title": "Sensory Evaluation and Tasting",
    "category": "academy",
    "description": "Join us for an introductory sensory workshop presented by our Head of Academy: Shan Black. She will open up the sensory world by teaching you what the basic tastes encompass and how all your senses work together to bring flavour to life. This fully immersive experience is one that will truly change the way you taste coffee! Venue 40 Canterbury Str, District Six, Cape Town",
    "images": [
      "/assets/products/sensory-evaluation-and-tasting-1.jpg"
    ],
    "variants": [
      {
        "id": "52398791524635",
        "title": "28 August 2026 | 09:00 - 11:00",
        "price": 35000,
        "date": "2026-08-28"
      },
      {
        "id": "54056280523035",
        "title": "19 October 2026 | 13:00 - 15:00",
        "price": 35000,
        "date": "2026-10-19"
      }
    ],
    "optionName": "Date"
  },
  {
    "handle": "becoming-a-cafe-barista",
    "title": "Training the Café Barista",
    "category": "academy",
    "description": "Training a Café Barista is a two-day immersive training designed to ensure you are able to show up more confidently in your role as a professional barista in the café you are working at . Running from 9am to 3pm over two days, this course gives you the foundation needed to both make and serve coffee exceptionally well. We balance theory and hands-on practice, allowing you to not only understand the why behind great coffee, but to confidently apply it behind the bar. The course begins by exploring the heart and culture behind what makes coffee truly great, grounding the experience in purpose, craft, and hospitality.",
    "images": [
      "/assets/products/becoming-a-cafe-barista-1.jpg"
    ],
    "variants": [
      {
        "id": "52389597020443",
        "title": "16-17 July 2026 | 09:00 - 15:00",
        "price": 285000,
        "date": "2026-07-16"
      },
      {
        "id": "54056278851867",
        "title": "15-16 October 2026 | 09:00 - 15:00",
        "price": 285000,
        "date": "2026-10-15"
      }
    ],
    "optionName": "Date"
  }
];

export const productByHandle = (handle: string) => PRODUCTS.find((p) => p.handle === handle);

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Variants still on sale: undated, or dated today or later. */
export const liveVariants = (product: Product) =>
  product.variants.filter((v) => !v.date || v.date >= todayIso());

export const isLiveVariant = (variant: Variant) => !variant.date || variant.date >= todayIso();

export const findVariant = (variantId: string) => {
  for (const product of PRODUCTS) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
};

export const formatRand = (cents: number) =>
  "R" + (cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
