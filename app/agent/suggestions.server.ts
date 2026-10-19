import { generateText, Output, type ModelMessage } from "ai";
import { z } from "zod";

import { MODEL } from "./model";
import { SUGGESTIONS_PROMPT } from "./prompts/suggestions";

const SUGGESTIONS_SCHEMA = z.object({
  suggestions: z.array(z.string().min(1).max(30)).length(3),
});

export async function generateSuggestions(
  messages: ModelMessage[],
): Promise<string[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const { output } = await generateText({
        model: MODEL,
        reasoning: "none",
        output: Output.object({ schema: SUGGESTIONS_SCHEMA }),
        messages: [...messages, { role: "user", content: SUGGESTIONS_PROMPT }],
      });

      return output.suggestions;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
}
