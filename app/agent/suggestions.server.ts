import { generateText, Output, type ModelMessage } from "ai";
import { z } from "zod";

import { log } from "../log/logger.server";
import { MODEL } from "./model";
import { SUGGESTIONS_PROMPT } from "./prompts/suggestions";

const SUGGESTIONS_SCHEMA = z.object({
  suggestions: z.array(z.string().min(1).max(30)).length(3),
});

export async function generateSuggestions(
  messages: ModelMessage[],
): Promise<string[]> {
  for (let attempt = 1; ; attempt++) {
    const start = Date.now();
    try {
      const { output } = await generateText({
        model: MODEL,
        reasoning: "none",
        output: Output.object({ schema: SUGGESTIONS_SCHEMA }),
        messages: [...messages, { role: "user", content: SUGGESTIONS_PROMPT }],
      });

      log.info(
        "suggest",
        "ok",
        { attempt, ms: Date.now() - start },
        { depth: 1 },
      );
      log.info(
        "suggest",
        "replies",
        {},
        { depth: 2, detail: output.suggestions.join('" | "'), quote: "model" },
      );
      return output.suggestions;
    } catch (error) {
      const reason = `"${error instanceof Error ? error.message : String(error)}"`;
      if (attempt === 3) {
        log.error("suggest", "✗ failed", { attempt, reason }, { depth: 1 });
        throw error;
      }
      log.warn("suggest", "retry", { attempt, reason }, { depth: 1 });
    }
  }
}
