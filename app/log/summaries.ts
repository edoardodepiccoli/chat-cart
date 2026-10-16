import type { ToolName } from "../../shared/tools";

type Obj = Record<string, unknown>;

const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): value is string => typeof value === "string";

function titles(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => isObj(item) && text(item.title))) return null;
  return value.map((item) => (item as Obj).title as string);
}

function range(min: string, max: string, currency: string): string {
  return min === max ? `${min} ${currency}` : `${min}–${max} ${currency}`;
}

function bytes(output: unknown): string {
  try {
    return `${JSON.stringify(output)?.length ?? 0} B`;
  } catch {
    return "0 B";
  }
}

function summarize(tool: ToolName, output: unknown): string[] | null {
  switch (tool) {
    case "listProducts": {
      if (!Array.isArray(output)) return null;
      const names = titles(output);
      if (!names) return null;
      const lines = output.slice(0, 5).map((item, i) => {
        const { price } = item as Obj;
        if (!isObj(price)) return `"${names[i]}"`;
        const { min, max, currencyCode } = price;
        if (!text(min) || !text(max) || !text(currencyCode))
          return `"${names[i]}"`;
        return `"${names[i]}" ${range(min, max, currencyCode)}`;
      });
      const more = output.length - lines.length;
      return [
        `${output.length} match`,
        ...lines,
        ...(more > 0 ? [`+${more} more`] : []),
      ];
    }
    case "listCollections":
    case "listStorePages": {
      const names = titles(output);
      if (!names) return null;
      return [`${names.length}: ${names.map((n) => `"${n}"`).join(", ")}`];
    }
    case "getProduct": {
      if (output === null) return ["⚠ not found"];
      if (!isObj(output) || !text(output.title)) return null;
      if (!Array.isArray(output.variants)) return null;
      const variants = output.variants.filter(isObj);
      const prices = variants.flatMap((variant) => {
        const price = variant.price;
        return isObj(price) && text(price.amount) && text(price.currencyCode)
          ? [{ amount: price.amount, currency: price.currencyCode }]
          : [];
      });
      const sorted = [...prices].sort(
        (a, b) => Number(a.amount) - Number(b.amount),
      );
      const price = sorted.length
        ? range(
            sorted[0].amount,
            sorted[sorted.length - 1].amount,
            sorted[0].currency,
          )
        : null;
      const labels = variants.map((variant) => {
        const selected = Array.isArray(variant.selectedOptions)
          ? variant.selectedOptions
              .filter(isObj)
              .map((option) => String(option.value))
          : [];
        const mark = variant.available ? "✓" : "✗";
        return selected.length ? `${selected.join(" / ")} ${mark}` : mark;
      });
      const count = variants.length;
      const withOptions = variants.some(
        (variant) =>
          Array.isArray(variant.selectedOptions) &&
          variant.selectedOptions.length > 0,
      );
      const head = `"${output.title}", ${count} variant${count === 1 ? "" : "s"}`;
      const detail = count > 1 || withOptions ? ` (${labels.join(", ")})` : "";
      return [`${head}${detail}${price ? `, ${price}` : ""}`];
    }
    case "getStorePage": {
      if (output === null) return ["⚠ not found"];
      if (!isObj(output) || !text(output.title) || !text(output.text))
        return null;
      return [`"${output.title}", ${output.text.length} chars`];
    }
    case "showProducts": {
      if (!isObj(output) || !Array.isArray(output.products)) return null;
      if (!output.products.every(isObj)) return null;
      return output.products.map((product, i) => {
        const { title, price } = product as Obj;
        const amount =
          isObj(price) && text(price.amount) && text(price.currencyCode)
            ? ` ${price.amount} ${price.currencyCode}`
            : "";
        return `${i + 1}. "${String(title)}"${amount}`;
      });
    }
    case "showFaqCard": {
      if (!isObj(output) || !text(output.title) || !text(output.answer))
        return null;
      return [`"${output.title}": "${output.answer}"`];
    }
  }
}

export function summarizeToolResult(tool: ToolName, output: unknown): string[] {
  try {
    return summarize(tool, output) ?? [bytes(output)];
  } catch {
    return [bytes(output)];
  }
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(formatValue).join(",")}]`;
  if (isObj(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return "{}";
    }
  }
  return String(value);
}

export function formatInput(input: unknown): string {
  if (!isObj(input)) return "";
  return Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(" ");
}
