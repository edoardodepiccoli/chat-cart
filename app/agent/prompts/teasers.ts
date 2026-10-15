import type { ProductOption } from "../../../shared/product";

export type TeaserProduct = {
  title: string;
  description: string;
  tags: string[];
  options: ProductOption[];
};

export function teaserPrompt(product: TeaserProduct, language: string) {
  const options = product.options
    .map((option) => `${option.name}: ${option.values.join(", ")}`)
    .join("; ");

  return `I'm a shopper looking at this product's page in an online store.

Title: ${product.title}
Description: ${product.description}
Tags: ${product.tags.join(", ")}
Options: ${options || "none"}

Write the one short message I'd most likely tap to send to the store's shopping assistant, the one that moves me closest to buying this product. Write it in first person, in my words, under 10 words. It can be a question, a request or a statement, like asking which option suits me, what it goes well with, or about shipping or returns.

The assistant can only answer from the text above and the store's policy pages, so only mention what it can answer: something the description says, the options above, or shipping and returns. Never mention anything the text above doesn't.

Language: ${language || "English"}. Answer with the message only, no quotes.`;
}
