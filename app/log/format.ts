export type Level = "debug" | "info" | "warn" | "error";
export type Tag =
  | "chat"
  | "context"
  | "agent"
  | "tool"
  | "suggest"
  | "teaser"
  | "db"
  | "events"
  | "client"
  | "webhook"
  | "server";
export type Fields = Record<string, string | number | boolean | undefined>;
export type LogEvent = {
  time: Date;
  level: Level;
  tag: Tag;
  message: string;
  detail?: string;
  quote?: "shopper" | "model";
  depth: number;
  edge?: "start" | "end";
  fields: Fields;
  ctx?: { req: string; conv?: string; route: string };
  payload?: unknown;
};

const RESET = "\x1b[0m";
const BOLD = "1";
const DIM = "2";
const ITALIC = "3";
const RED = "31";
const GREEN = "32";
const YELLOW = "33";
const BLUE = "34";
const MAGENTA = "35";
const CYAN = "36";
const WHITE = "37";
const GRAY = "90";

const TAG_COLORS: Record<Tag, string> = {
  chat: BLUE,
  context: CYAN,
  agent: MAGENTA,
  tool: GREEN,
  suggest: YELLOW,
  teaser: YELLOW,
  db: GRAY,
  events: WHITE,
  client: RED,
  webhook: BLUE,
  server: RED,
};

const QUOTE_LIMIT = 160;
const MESSAGE_WIDTH = 24;

export function clean(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/[\r\n]/g, " ");
}

function safeStringify(value: unknown, space?: number): string {
  try {
    return JSON.stringify(value, null, space) ?? "undefined";
  } catch {
    return "[unserializable]";
  }
}

function detailText(event: LogEvent): string | undefined {
  if (event.detail === undefined) return undefined;
  const text = clean(event.detail);
  if (!event.quote) return text;
  const cut =
    text.length > QUOTE_LIMIT ? `${text.slice(0, QUOTE_LIMIT)}…` : text;
  return `"${cut}"`;
}

function paint(code: string, text: string, color: boolean): string {
  return color ? `\x1b[${code}m${text}${RESET}` : text;
}

function msColor(
  value: string | number | boolean | undefined,
): string | undefined {
  if (typeof value !== "number") return undefined;
  if (value >= 5000) return RED;
  if (value >= 2000) return YELLOW;
  return undefined;
}

function formatField(
  key: string,
  value: string | number | boolean,
  color: boolean,
): string {
  const text = `${key}=${value}`;
  const code = key === "ms" ? msColor(value) : undefined;
  return code ? paint(code, text, color) : text;
}

function styleDetail(event: LogEvent, text: string, color: boolean): string {
  if (!color) return text;
  const symbols = text
    .replaceAll("⚠", paint(YELLOW, "⚠", true))
    .replaceAll("✓", paint(GREEN, "✓", true))
    .replaceAll("✗", paint(RED, "✗", true));
  if (event.quote === "shopper") return paint(BOLD, symbols, true);
  if (event.quote === "model") return paint(ITALIC, symbols, true);
  return symbols;
}

export function formatPretty(
  event: LogEvent,
  { color }: { color: boolean },
): string {
  const { time, level, tag, depth, edge } = event;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const stamp = `${pad2(time.getHours())}:${pad2(time.getMinutes())}:${pad2(time.getSeconds())}.${String(time.getMilliseconds()).padStart(3, "0")}`;

  const levelText = level.toUpperCase().padEnd(5);
  const levelCode =
    level === "warn"
      ? YELLOW
      : level === "error"
        ? RED
        : level === "debug"
          ? DIM
          : undefined;
  const levelOut = levelCode ? paint(levelCode, levelText, color) : levelText;

  const tagOut = paint(TAG_COLORS[tag], tag.padEnd(7), color);

  const prefix = edge === "start" ? "▶ " : edge === "end" ? "■ " : "";
  const label = `${"  ".repeat(depth)}${prefix}${event.message}`.padEnd(
    MESSAGE_WIDTH,
  );
  let labelOut: string;
  if (level === "error") labelOut = paint(`${BOLD};${RED}`, label, color);
  else if (edge) labelOut = paint(BOLD, label, color);
  else if (event.detail !== undefined) labelOut = paint(DIM, label, color);
  else labelOut = label;

  const parts = [paint(DIM, stamp, color), levelOut, tagOut, labelOut];
  const text = detailText(event);
  if (text !== undefined) parts.push(styleDetail(event, text, color));
  for (const [key, value] of Object.entries(event.fields)) {
    if (value !== undefined) parts.push(formatField(key, value, color));
  }
  if (event.ctx) {
    const ctx = [
      event.ctx.conv ? `conv=${event.ctx.conv.slice(0, 5)}` : undefined,
      `req=${event.ctx.req}`,
    ]
      .filter(Boolean)
      .join(" ");
    parts.push(paint(DIM, ctx, color));
  }

  let out = parts.join(" ").trimEnd();
  if (event.payload !== undefined) {
    const block = safeStringify(event.payload, 2)
      .split("\n")
      .map((l) => paint(DIM, `${"  ".repeat(depth + 1)}${l}`, color))
      .join("\n");
    out += `\n${block}`;
  }
  return edge === "start" ? `\n${out}` : out;
}

export function formatJson(event: LogEvent): string {
  const object = {
    time: event.time.toISOString(),
    level: event.level,
    tag: event.tag,
    message: event.message,
    detail: detailText(event),
    depth: event.depth,
    fields: event.fields,
    conv: event.ctx?.conv,
    req: event.ctx?.req,
    route: event.ctx?.route,
    payload: event.payload,
  };
  try {
    return JSON.stringify(object);
  } catch {
    return JSON.stringify({ ...object, payload: "[unserializable]" });
  }
}
