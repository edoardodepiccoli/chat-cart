import type { ProductSummary } from "../shared/product";

export type Call = { name: string; input: unknown };

export type Shown = { name: string; input: unknown; output: unknown };

export type Turn = {
  user: string;
  steps: { text: string; calls: Call[] }[];
  text: string;
  lookups: Call[];
  shown: Shown[];
  suggestions: string[];
};

export type Check = { name: string; run: (turn: Turn) => string | null };

export const DATA_TOOLS = [
  "listProducts",
  "listCollections",
  "getProduct",
  "listStorePages",
  "getStorePage",
];

export function check(name: string, run: Check["run"]): Check {
  return { name, run };
}

function shownProducts(turn: Turn): ProductSummary[] {
  return turn.shown.flatMap(({ name, output }) =>
    name === "showProducts"
      ? (output as { products: ProductSummary[] }).products
      : [],
  );
}

function matches(input: unknown, expected: Record<string, unknown>): boolean {
  const actual = (input ?? {}) as Record<string, unknown>;
  return Object.entries(expected).every(
    ([key, value]) => JSON.stringify(actual[key]) === JSON.stringify(value),
  );
}

export function shows(tool: string, handles: string[] = []): Check {
  return check(
    `shows ${tool}${handles.length ? ` ${handles}` : ""}`,
    (turn) => {
      if (turn.shown[0]?.name !== tool)
        return `showed ${turn.shown[0]?.name ?? "nothing"}`;
      const shownHandles = shownProducts(turn).map((product) => product.handle);
      const missing = handles.filter(
        (handle) => !shownHandles.includes(handle),
      );
      return missing.length ? `missing ${missing.join(", ")}` : null;
    },
  );
}

export function showsNothing(): Check {
  return check("shows nothing", (turn) =>
    turn.shown.length ? `showed ${turn.shown[0].name}` : null,
  );
}

export function notShows(tool: string, handles: string[] = []): Check {
  return check(
    `does not show ${tool}${handles.length ? ` ${handles}` : ""}`,
    (turn) => {
      if (turn.shown[0]?.name !== tool) return null;
      if (!handles.length) return `showed ${tool}`;
      const shownHandles = shownProducts(turn).map((product) => product.handle);
      const found = handles.filter((handle) => shownHandles.includes(handle));
      return found.length ? `showed ${found.join(", ")}` : null;
    },
  );
}

export function looksUp(
  tool: string,
  input: Record<string, unknown> = {},
): Check {
  return check(
    `looks up ${tool}${Object.keys(input).length ? ` ${JSON.stringify(input)}` : ""}`,
    (turn) =>
      turn.lookups.some(
        (call) => call.name === tool && matches(call.input, input),
      )
        ? null
        : `lookups: ${turn.lookups.map((call) => call.name).join(", ") || "none"}`,
  );
}

export function says(pattern: RegExp): Check {
  return check(`says ${pattern}`, (turn) =>
    pattern.test(turn.text) ? null : `text: "${turn.text}"`,
  );
}

export function notSays(pattern: RegExp): Check {
  return check(`does not say ${pattern}`, (turn) => {
    const found = turn.text.match(pattern);
    return found ? `said "${found[0]}"` : null;
  });
}

export function pricesAtMost(max: number): Check {
  return check(`shown prices at most ${max}`, (turn) => {
    const over = shownProducts(turn).filter(
      (product) => Number(product.price.amount) > max,
    );
    return over.length
      ? `over budget: ${over.map((product) => product.handle).join(", ")}`
      : null;
  });
}

export function suggestionsSay(pattern: RegExp): Check {
  return check(`suggestions say ${pattern}`, (turn) =>
    turn.suggestions.some((suggestion) => pattern.test(suggestion))
      ? null
      : `suggestions: ${turn.suggestions.join(" | ")}`,
  );
}

const PRODUCT_OR_CART = ["showProducts"];

export const CONTRACT: Check[] = [
  check("reply is not empty", (turn) =>
    turn.text || turn.shown.length ? null : "no text and nothing shown",
  ),
  check("no text while looking things up", (turn) => {
    const step = turn.steps.find(
      (step) =>
        step.text &&
        step.calls.length &&
        step.calls.every((call) => DATA_TOOLS.includes(call.name)),
    );
    return step ? `wrote "${step.text}" before ${step.calls[0].name}` : null;
  }),
  check("text written once", (turn) => {
    const count = turn.steps.filter((step) => step.text).length;
    return count > 1 ? `text in ${count} steps` : null;
  }),
  check("at most one display", (turn) =>
    turn.shown.length > 1
      ? `showed ${turn.shown.map((shown) => shown.name).join(", ")}`
      : null,
  ),
  check("products and cart come with text", (turn) =>
    PRODUCT_OR_CART.includes(turn.shown[0]?.name ?? "") && !turn.text
      ? `${turn.shown[0].name} without text`
      : null,
  ),
  check("FAQ card comes alone", (turn) =>
    turn.shown[0]?.name === "showFaqCard" && turn.text
      ? `text with FAQ card: "${turn.text}"`
      : null,
  ),
  check("at most 40 words", (turn) => {
    const words = turn.text.split(/\s+/).filter(Boolean).length;
    return words > 40 ? `${words} words` : null;
  }),
  check("plain text", (turn) =>
    /\*\*|^#|\n|^\s*[-*] |\]\(/m.test(turn.text)
      ? "markdown or line break"
      : null,
  ),
  check("at most one question", (turn) => {
    const count = (turn.text.match(/\?/g) ?? []).length;
    return count > 1 ? `${count} questions` : null;
  }),
  check("no question when showing products or cart", (turn) =>
    PRODUCT_OR_CART.includes(turn.shown[0]?.name ?? "") &&
    turn.text.trim().endsWith("?")
      ? "ends with a question"
      : null,
  ),
  check("no internals", (turn) => {
    const found = turn.text.match(
      /\b(tools?|handles?|variants?|listProducts|getProduct|show\w*Cards?|system prompt)\b/i,
    );
    return found ? `said "${found[0]}"` : null;
  }),
  check("three valid suggestions", (turn) => {
    const { suggestions } = turn;
    if (suggestions.length !== 3) return `${suggestions.length} suggestions`;
    if (new Set(suggestions.map((s) => s.toLowerCase())).size !== 3)
      return `duplicates: ${suggestions.join(" | ")}`;
    return null;
  }),
];
