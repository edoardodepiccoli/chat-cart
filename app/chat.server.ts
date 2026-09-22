import type { ChatMessage } from "../chat-widget/src/components/types";
import type { ProductCardProps } from "../chat-widget/src/components/ProductCard";

const SWEATPANTS: ProductCardProps = {
  handle: "sweatpants",
  title: "Sweatpants",
  imageUrl:
    "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/e4fe192f0e86ffc74d3b906f754119d4b5f4432cf01120d090ab7eb5182e8897.jpg?width=440&height=440",
  imageAlt: null,
  options: [
    { name: "Size", values: ["Small", "Medium", "Large"] },
    { name: "Color", values: ["Green", "Olive", "Ocean", "Purple", "Red"] },
  ],
  variants: [
    {
      id: "gid://shopify/ProductVariant/43696926949398",
      selectedOptions: [{ name: "Size", value: "Small" }, { name: "Color", value: "Green" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/e4fe192f0e86ffc74d3b906f754119d4b5f4432cf01120d090ab7eb5182e8897.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43695714500630",
      selectedOptions: [{ name: "Size", value: "Small" }, { name: "Color", value: "Olive" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/249f18090f82590253df7dd7a9aa8d356e1d23074d654166a822b1a6f31a2482.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696926982166",
      selectedOptions: [{ name: "Size", value: "Small" }, { name: "Color", value: "Ocean" }],
      price: { amount: "42.0", currencyCode: "CAD" },
      compareAtPrice: { amount: "52.0", currencyCode: "CAD" },
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/31ea77a355c5d4f6e8037bc0b2e9edb7eefa1ef16893dd424cafaa394a6b6a4e.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927014934",
      selectedOptions: [{ name: "Size", value: "Small" }, { name: "Color", value: "Purple" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: false,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/712afaa8bf6e22e94ee0d6157fcc457c2b92f07debf57eacf4cdefb08aad65a0.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927047702",
      selectedOptions: [{ name: "Size", value: "Small" }, { name: "Color", value: "Red" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/183bd1d0ba83be4a8bceb4b55c47dc9926c94caaa35dccbe91399b17dbd593f6.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927080470",
      selectedOptions: [{ name: "Size", value: "Medium" }, { name: "Color", value: "Green" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/e4fe192f0e86ffc74d3b906f754119d4b5f4432cf01120d090ab7eb5182e8897.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43695714533398",
      selectedOptions: [{ name: "Size", value: "Medium" }, { name: "Color", value: "Olive" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/249f18090f82590253df7dd7a9aa8d356e1d23074d654166a822b1a6f31a2482.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927113238",
      selectedOptions: [{ name: "Size", value: "Medium" }, { name: "Color", value: "Ocean" }],
      price: { amount: "42.0", currencyCode: "CAD" },
      compareAtPrice: { amount: "52.0", currencyCode: "CAD" },
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/31ea77a355c5d4f6e8037bc0b2e9edb7eefa1ef16893dd424cafaa394a6b6a4e.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927146006",
      selectedOptions: [{ name: "Size", value: "Medium" }, { name: "Color", value: "Purple" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: false,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/712afaa8bf6e22e94ee0d6157fcc457c2b92f07debf57eacf4cdefb08aad65a0.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927178774",
      selectedOptions: [{ name: "Size", value: "Medium" }, { name: "Color", value: "Red" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/183bd1d0ba83be4a8bceb4b55c47dc9926c94caaa35dccbe91399b17dbd593f6.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927211542",
      selectedOptions: [{ name: "Size", value: "Large" }, { name: "Color", value: "Green" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/e4fe192f0e86ffc74d3b906f754119d4b5f4432cf01120d090ab7eb5182e8897.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43695714566166",
      selectedOptions: [{ name: "Size", value: "Large" }, { name: "Color", value: "Olive" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/249f18090f82590253df7dd7a9aa8d356e1d23074d654166a822b1a6f31a2482.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927244310",
      selectedOptions: [{ name: "Size", value: "Large" }, { name: "Color", value: "Ocean" }],
      price: { amount: "42.0", currencyCode: "CAD" },
      compareAtPrice: { amount: "52.0", currencyCode: "CAD" },
      available: false,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/31ea77a355c5d4f6e8037bc0b2e9edb7eefa1ef16893dd424cafaa394a6b6a4e.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927277078",
      selectedOptions: [{ name: "Size", value: "Large" }, { name: "Color", value: "Purple" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: false,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/712afaa8bf6e22e94ee0d6157fcc457c2b92f07debf57eacf4cdefb08aad65a0.jpg?width=440&height=440",
    },
    {
      id: "gid://shopify/ProductVariant/43696927309846",
      selectedOptions: [{ name: "Size", value: "Large" }, { name: "Color", value: "Red" }],
      price: { amount: "35.0", currencyCode: "CAD" },
      compareAtPrice: null,
      available: true,
      imageUrl:
        "https://cdn.shopify.com/mock-shop-production-media/_seeds/demostore/183bd1d0ba83be4a8bceb4b55c47dc9926c94caaa35dccbe91399b17dbd593f6.jpg?width=440&height=440",
    },
  ],
};

const GREETING = "Hi! Ask me anything about this store.";

export async function reply(messages: ChatMessage[]): Promise<ChatMessage> {
  const turn = messages.filter((message) => message.role === "user").length;

  if (turn === 0) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [{ type: "data-textMessage", data: { text: GREETING } }],
    };
  }

  const isCard = turn % 2 === 0;

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [
      isCard
        ? { type: "data-productCard", data: SWEATPANTS }
        : {
            type: "data-textMessage",
            data: { text: "Still faking it — the agent layer comes next." },
          },
    ],
  };
}
