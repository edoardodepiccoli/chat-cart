import type { ToolName } from "../../shared/tools";
import { log } from "../log/logger.server";
import { formatInput, summarizeToolResult } from "../log/summaries";

export function logged<I, O>(
  name: ToolName,
  execute: (input: I) => Promise<O>,
): (input: I) => Promise<O> {
  return async (input) => {
    const start = Date.now();
    const header = () =>
      log.info("tool", name, { ms: Date.now() - start }, { depth: 2 });
    const detail = formatInput(input);
    const showInput = () => {
      if (detail) log.info("tool", "input", {}, { depth: 3, detail });
    };
    try {
      const output = await execute(input);
      header();
      showInput();
      summarizeToolResult(name, output).forEach((line, i) =>
        log.info("tool", i ? "" : "result", {}, { depth: 3, detail: line }),
      );
      log.debug("tool", "output", {}, { depth: 3, payload: output });
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      header();
      showInput();
      log.warn(
        "tool",
        "result",
        {},
        { depth: 3, detail: `⚠ error "${message}"` },
      );
      throw error;
    }
  };
}
