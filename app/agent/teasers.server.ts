import { generateText } from "ai";

import { MODEL } from "./model";
import { teaserPrompt, type TeaserProduct } from "./prompts/teasers";

export async function generateTeaser(
  product: TeaserProduct,
  language: string,
): Promise<string> {
  const { text } = await generateText({
    model: MODEL,
    reasoning: "none",
    prompt: teaserPrompt(product, language),
  });

  return text.trim();
}
