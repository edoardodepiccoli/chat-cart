import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";

import type { ChatEvent, ChatPart } from "../shared/chat";
import type {
  Product,
  ProductImage,
  ProductOption,
  ProductVariant,
  SelectedOption,
} from "../shared/product";

type SeedProduct = {
  handle: string;
  title: string;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
};

type Chat = {
  at: number;
  faqUrl: string;
  suggestions: string[];
  messages: Prisma.MessageCreateWithoutConversationInput[];
  events: Prisma.EventCreateWithoutConversationInput[];
};

const ENGAGED = 100;
const BOUNCES = 300;
const DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;
const HOURS = [
  8, 9, 10, 11, 12, 12, 13, 13, 14, 15, 16, 17, 18, 19, 19, 20, 20, 21, 21,
  21, 22, 22, 23,
];

const PRODUCTS: SeedProduct[] = JSON.parse(
  readFileSync(new URL("./seed-products.json", import.meta.url), "utf8"),
);

const INFO: Record<string, { pitch: string; asks: string[] }> = {
  "redwing-iron-ranger": {
    pitch:
      "The Red Wing Iron Ranger is a rugged leather boot made to be worn hard for years. It takes a few wears to break in, then it fits like nothing else.",
    asks: [
      "Do you sell boots?",
      "I need sturdy boots for everyday wear",
      "Do you have leather boots?",
    ],
  },
  "foraker-canvas-coat": {
    pitch:
      "The Duckworth Woolfill Jacket is insulated with American wool, so it's warm without the bulk, and the canvas shell stands up to wind and light rain.",
    asks: [
      "I'm looking for a warm jacket",
      "Do you have winter coats?",
      "Need a jacket for cold mornings",
    ],
  },
  "scout-backpack": {
    pitch:
      "The Scout Backpack is a waxed canvas daypack with leather straps. It fits a 15\" laptop and everything you need for a day out.",
    asks: [
      "Do you have backpacks?",
      "I need a backpack that fits a laptop",
      "Looking for a daypack",
    ],
  },
  "snow-peak-mola-headlamp": {
    pitch:
      "The Mola Headlamp is small, bright and runs on AAA batteries, great for camping, night walks and power cuts.",
    asks: [
      "Do you sell headlamps?",
      "I need a light for camping",
      "Anything to see at night on the trail?",
    ],
  },
  "hudderton-backpack": {
    pitch:
      "The Hudderton is a lighter everyday canvas backpack with a padded laptop sleeve, a bit simpler and cheaper than the Scout.",
    asks: [
      "Do you have a cheaper backpack?",
      "Looking for a simple everyday backpack",
      "I need a bag for school",
    ],
  },
  "derby-tier-backpack": {
    pitch:
      "The Derby Tier is a roll-top backpack with lots of room, made for weekend trips and carry-on travel.",
    asks: [
      "Do you have a big backpack for travel?",
      "I need a bag for a weekend trip",
      "Any roll-top backpacks?",
    ],
  },
  "canvas-lunch-bag": {
    pitch:
      "The Canvas Lunch Bag is a small, sturdy bag that keeps lunch tidy on the way to work or on a hike.",
    asks: [
      "Do you sell lunch bags?",
      "Looking for something to carry my lunch",
      "Any small bags?",
    ],
  },
  "5-panel-hat": {
    pitch:
      "The 5 Panel Camp Cap is a light cotton cap with an adjustable strap, in four colors.",
    asks: ["Do you sell hats?", "I want a cap for summer", "Any caps?"],
  },
};

const FAQS = [
  {
    asks: [
      "How much is shipping?",
      "Do you offer free shipping?",
      "What does shipping cost?",
    ],
    answer:
      "Standard shipping is $8.00 and it's free on orders of $70 or more, no code needed. Express is $15.00. You'll see the exact cost at checkout before you pay.",
    suggestions: [
      "How long does delivery take?",
      "Show me your best sellers",
      "Do you have gift ideas?",
    ],
  },
  {
    asks: [
      "What's your return policy?",
      "Can I return it if it doesn't fit?",
      "How do returns work?",
    ],
    answer:
      "You can return items within 30 days of delivery for a full refund, as long as they're unused, unwashed and in their original condition with tags attached. Refunds go back to your original payment method within 5 business days of us receiving the return.",
    suggestions: [
      "How much is shipping?",
      "Show me your best sellers",
      "Do you have gift ideas?",
    ],
  },
  {
    asks: [
      "How long does delivery take?",
      "When will my order arrive?",
      "How fast do you ship?",
    ],
    answer:
      "Most orders ship within 1–2 business days. Standard delivery then takes 3–7 business days and Express 1–3 business days.",
    suggestions: [
      "How much is shipping?",
      "Show me your best sellers",
      "Do you have gift ideas?",
    ],
  },
  {
    asks: ["Do you ship to Canada?", "Do you ship internationally?"],
    answer:
      "We currently ship to addresses in the United States only, and all prices are charged in US dollars.",
    suggestions: [
      "How much is shipping?",
      "Show me your best sellers",
      "Do you have gift ideas?",
    ],
  },
  {
    asks: ["How do I track my order?", "Where is my order?"],
    answer:
      "As soon as your order ships we'll email you a tracking link, and you can also find it on your order confirmation page. Tracking can take up to 48 hours to show the first scan.",
    suggestions: [
      "How long does delivery take?",
      "Show me your best sellers",
      "Do you have gift ideas?",
    ],
  },
];

const GIFT_ASKS = [
  "I need a gift for my dad",
  "Looking for a birthday present for my boyfriend",
  "Gift ideas for someone who loves camping?",
  "Something nice for my sister under $150?",
  "What would make a good gift for a hiker?",
  "christmas present for my brother, any ideas?",
];

const GIFT_INTROS = [
  "Here are a few ideas that make great gifts:",
  "These are popular picks for gifts:",
  "A few gifts people love:",
];

const GIFT_INTERESTS = [
  "They love the outdoors",
  "Something for everyday use",
  "They travel a lot",
];

const GREETINGS = [
  "Hi! What do you sell?",
  "hello",
  "What's popular right now?",
  "hey, just looking around",
];

const CARD_SUGGESTIONS = [
  "How much is shipping?",
  "Can I return it if it doesn't fit?",
  "Show me something similar",
];

const CARDS_SUGGESTIONS = [
  "Which one is the most popular?",
  "Anything under $50?",
  "How much is shipping?",
];

const CART_SUGGESTIONS = [
  "Do you offer free shipping?",
  "How long does delivery take?",
  "Show me something to go with it",
];

let seed = 20260930;

function random() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function between(min: number, max: number) {
  return min + random() * (max - min);
}

function chance(p: number) {
  return random() < p;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function sample<T>(items: readonly T[], count: number): T[] {
  const left = [...items];
  const picked: T[] = [];
  while (picked.length < count && left.length) {
    picked.push(left.splice(Math.floor(random() * left.length), 1)[0]);
  }
  return picked;
}

function product(handle: string): SeedProduct {
  const found = PRODUCTS.find((item) => item.handle === handle);
  if (!found) throw new Error(`No seed product ${handle}`);
  return found;
}

function variantFor(
  item: SeedProduct,
  picks: SelectedOption[],
): ProductVariant {
  const matches = (variant: ProductVariant) =>
    picks.every((choice) =>
      variant.selectedOptions.some(
        (option) =>
          option.name === choice.name && option.value === choice.value,
      ),
    );
  return (
    item.variants.find((variant) => variant.available && matches(variant)) ??
    item.variants.find((variant) => variant.available) ??
    item.variants[0]
  );
}

function card(item: SeedProduct, picks: SelectedOption[]): Product {
  return { ...item, selectedOptions: variantFor(item, picks).selectedOptions };
}

function toolCallId() {
  return `chatcmpl-tool-${randomUUID().replaceAll("-", "")}`;
}

function loadTime(): Date {
  const date = new Date(Date.now() - Math.floor(between(0, DAYS)) * DAY);
  date.setHours(
    pick(HOURS),
    Math.floor(between(0, 60)),
    Math.floor(between(0, 60)),
    0,
  );
  if (date.getTime() > Date.now()) date.setTime(date.getTime() - DAY);
  return date;
}

function wait(chat: Chat, min: number, max: number) {
  chat.at += Math.round(between(min, max) * 1000);
}

function record(chat: Chat, event: ChatEvent) {
  chat.events.push({
    type: event.type,
    data: "data" in event ? event.data : undefined,
    createdAt: new Date(chat.at),
  });
}

function say(chat: Chat, role: "user" | "assistant", parts: ChatPart[]) {
  chat.messages.push({
    id: randomUUID(),
    role,
    parts: parts as Prisma.InputJsonValue,
    createdAt: new Date(chat.at),
  });
}

function user(chat: Chat, text: string) {
  wait(chat, 12, 75);
  if (chat.suggestions.includes(text) && chance(0.6)) {
    record(chat, { type: "suggestion_clicked", data: { text } });
  }
  say(chat, "user", [{ type: "text", text }]);
}

function act(chat: Chat, event: ChatEvent, text: string) {
  wait(chat, 5, 40);
  record(chat, event);
  say(chat, "user", [{ type: "text", text }]);
}

function assistant(
  chat: Chat,
  text: string,
  tool: ChatPart | null,
  suggestions: string[],
) {
  wait(chat, 4, 14);
  const parts: ChatPart[] = [{ type: "step-start" }];
  if (text) parts.push({ type: "text", text, state: "done" });
  if (tool) parts.push(tool);
  parts.push({ type: "data-suggestions", data: suggestions });
  say(chat, "assistant", parts);
  chat.suggestions = suggestions;
}

function checkout(chat: Chat) {
  wait(chat, 3, 45);
  record(chat, { type: "checkout_clicked" });
}

function faq(chat: Chat, text: string) {
  user(chat, text);
  const topic = FAQS.find((item) => item.asks.includes(text)) ?? FAQS[0];
  assistant(
    chat,
    "",
    {
      type: "tool-showFaqCard",
      toolCallId: toolCallId(),
      state: "output-available",
      input: { handle: "faq", answer: topic.answer },
      output: { title: "FAQ", answer: topic.answer, url: chat.faqUrl },
    },
    topic.suggestions,
  );
  if (chance(0.3)) {
    wait(chat, 5, 30);
    record(chat, { type: "link_clicked", data: { url: chat.faqUrl } });
  }
}

function addToCart(
  chat: Chat,
  item: SeedProduct,
  picks: SelectedOption[],
) {
  const variant = variantFor(item, picks);
  const label =
    item.variants.length > 1
      ? ` (${variant.selectedOptions.map((option) => option.value).join(" / ")})`
      : "";
  act(
    chat,
    {
      type: "added_to_cart",
      data: {
        handle: item.handle,
        variantId: variant.id,
        price: variant.price,
      },
    },
    `I added ${item.title}${label} to my cart.`,
  );
  assistant(
    chat,
    pick([
      "Great choice! Here's your cart, you can check out whenever you're ready.",
      "Nice pick! Here's what's in your cart.",
      "Added! Here's your cart.",
    ]),
    {
      type: "tool-showCart",
      toolCallId: toolCallId(),
      state: "output-available",
      input: {},
      output: {},
    },
    CART_SUGGESTIONS,
  );
  if (chance(0.4)) return checkout(chat);
  if (chance(0.35)) {
    faq(chat, pick(CART_SUGGESTIONS.slice(0, 2)));
    if (chance(0.4)) checkout(chat);
  }
}

function showProduct(
  chat: Chat,
  item: SeedProduct,
  picks: SelectedOption[],
) {
  assistant(
    chat,
    INFO[item.handle].pitch,
    {
      type: "tool-showProductCard",
      toolCallId: toolCallId(),
      state: "output-available",
      input: { handle: item.handle, options: picks },
      output: card(item, picks),
    },
    CARD_SUGGESTIONS,
  );
  const roll = random();
  if (roll < 0.35) return addToCart(chat, item, picks);
  if (roll < 0.6) {
    faq(chat, pick(CARD_SUGGESTIONS.slice(0, 2)));
    if (chance(0.25)) addToCart(chat, item, picks);
    return;
  }
  if (roll < 0.7) {
    user(chat, "Show me something similar");
    const others = PRODUCTS.filter((other) => other.handle !== item.handle);
    showCards(chat, sample(others, 3), "Here are a few similar picks:");
  }
}

function showCards(chat: Chat, items: SeedProduct[], intro: string) {
  assistant(
    chat,
    intro,
    {
      type: "tool-showProductCards",
      toolCallId: toolCallId(),
      state: "output-available",
      input: { handles: items.map((item) => item.handle), options: [] },
      output: { products: items.map((item) => card(item, [])) },
    },
    CARDS_SUGGESTIONS,
  );
  const roll = random();
  if (roll < 0.5) {
    const liked = pick(items);
    act(
      chat,
      { type: "product_liked", data: { handle: liked.handle } },
      `I like ${liked.title}, tell me more about it.`,
    );
    return showProduct(chat, liked, []);
  }
  if (roll < 0.65) {
    user(chat, "Which one is the most popular?");
    const best = pick(items);
    const show = `Show me the ${best.title}`;
    assistant(
      chat,
      `The ${best.title} is one of our best sellers. ${INFO[best.handle].pitch}`,
      null,
      [show, "How much is shipping?", "Anything under $50?"],
    );
    if (chance(0.5)) {
      user(chat, show);
      showProduct(chat, best, []);
    }
    return;
  }
  if (roll < 0.72) {
    user(chat, "Anything under $50?");
    const cheap = PRODUCTS.filter(
      (item) => Number(item.variants[0].price.amount) < 50,
    );
    showCards(chat, cheap, "Sure, these are all under $50:");
  }
}

function gift(chat: Chat, text: string) {
  user(chat, text);
  if (chance(0.35)) {
    assistant(
      chat,
      "Happy to help! What are they into?",
      null,
      GIFT_INTERESTS,
    );
    user(chat, pick(GIFT_INTERESTS));
  }
  showCards(chat, sample(PRODUCTS, 3), pick(GIFT_INTROS));
}

function productSearch(chat: Chat) {
  const item = pick(PRODUCTS);
  user(chat, pick(INFO[item.handle].asks));
  const sizes = [
    ...new Set(
      item.variants
        .filter((variant) => variant.available)
        .flatMap((variant) => variant.selectedOptions)
        .filter((option) => option.name === "Size")
        .map((option) => option.value),
    ),
  ];
  if (sizes.length > 1 && chance(0.5)) {
    assistant(
      chat,
      "Sure! What size do you usually wear?",
      null,
      sample(sizes, 3),
    );
    const size = pick(chat.suggestions);
    user(chat, size);
    return showProduct(chat, item, [{ name: "Size", value: size }]);
  }
  showProduct(chat, item, []);
}

function question(chat: Chat) {
  const topic = pick(FAQS);
  faq(chat, pick(topic.asks));
  const roll = random();
  if (roll < 0.3) {
    user(chat, "Show me your best sellers");
    showCards(
      chat,
      ["scout-backpack", "redwing-iron-ranger", "5-panel-hat"].map(product),
      "These are our best sellers:",
    );
  } else if (roll < 0.5) {
    gift(chat, "Do you have gift ideas?");
  } else if (roll < 0.65) {
    faq(chat, topic.suggestions[0]);
  }
}

function browse(chat: Chat) {
  user(chat, pick(GREETINGS));
  assistant(
    chat,
    "Hi! We sell outdoor clothing, bags and gear made to last. Are you shopping for yourself or for a gift?",
    null,
    ["Show me your backpacks", "I'm looking for a gift", "What's good for camping?"],
  );
  const roll = random();
  if (roll < 0.3) {
    user(chat, "Show me your backpacks");
    showCards(
      chat,
      ["scout-backpack", "hudderton-backpack", "derby-tier-backpack"].map(
        product,
      ),
      "Here are our backpacks:",
    );
  } else if (roll < 0.5) {
    gift(chat, "I'm looking for a gift");
  } else if (roll < 0.7) {
    user(chat, "What's good for camping?");
    showCards(
      chat,
      ["snow-peak-mola-headlamp", "5-panel-hat", "foraker-canvas-coat"].map(
        product,
      ),
      "These are great for camping:",
    );
  }
}

const SCENARIOS = [
  (chat: Chat) => gift(chat, pick(GIFT_ASKS)),
  (chat: Chat) => gift(chat, pick(GIFT_ASKS)),
  (chat: Chat) => gift(chat, pick(GIFT_ASKS)),
  productSearch,
  productSearch,
  productSearch,
  productSearch,
  question,
  question,
  browse,
];

function engaged(shop: string): Prisma.ConversationCreateInput {
  const createdAt = loadTime();
  const chat: Chat = {
    at: createdAt.getTime(),
    faqUrl: `https://${shop}/pages/faq`,
    suggestions: [],
    messages: [],
    events: [],
  };
  wait(chat, 5, 120);
  record(chat, { type: "widget_opened" });
  pick(SCENARIOS)(chat);
  while (chance(0.35)) {
    wait(chat, 60, 1800);
    record(chat, { type: "widget_opened" });
  }
  return {
    shop,
    createdAt,
    messages: { create: chat.messages },
    events: { create: chat.events },
  };
}

function bounce(shop: string, opened: boolean): Prisma.ConversationCreateInput {
  const createdAt = loadTime();
  const openedAt = createdAt.getTime() + Math.round(between(5, 300) * 1000);
  return {
    shop,
    createdAt,
    events: opened
      ? {
          create: [{ type: "widget_opened", createdAt: new Date(openedAt) }],
        }
      : undefined,
  };
}

function eventCount(data: Prisma.ConversationCreateInput[], type: string) {
  return data.filter((conversation) => {
    const events = conversation.events?.create;
    return Array.isArray(events) && events.some((event) => event.type === type);
  }).length;
}

const prisma = new PrismaClient();
const session = await prisma.session.findFirst({ select: { shop: true } });

if (!session) {
  console.log(
    "No shop session yet: open the app in the Shopify admin first, then run npm run seed.",
  );
} else {
  const data = [
    ...Array.from({ length: ENGAGED }, () => engaged(session.shop)),
    ...Array.from({ length: BOUNCES }, () =>
      bounce(session.shop, chance(0.2)),
    ),
  ];

  await prisma.$transaction(
    data.map((conversation) => prisma.conversation.create({ data: conversation })),
  );

  console.log(
    `Seeded ${session.shop}: ${data.length} loads, ${eventCount(data, "widget_opened")} opened, ${ENGAGED} engaged, ${eventCount(data, "added_to_cart")} added to cart, ${eventCount(data, "checkout_clicked")} checkout.`,
  );
}

await prisma.$disconnect();
