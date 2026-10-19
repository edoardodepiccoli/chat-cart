/* eslint-disable no-control-regex */
export type Level = "debug" | "info" | "warn" | "error";
export type Tag =
  | "chat"
  | "context"
  | "agent"
  | "tool"
  | "suggest"
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
  db: GRAY,
  events: WHITE,
  client: RED,
  webhook: BLUE,
  server: RED,
};

const QUOTE_LIMIT = 160;
const MESSAGE_WIDTH = 24;

export function clean(text: string): string {
  return text
    .replace(/[\r\n]/g, " ")
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]?/g, "")
    .replace(/\x1b[@-_]?/g, "")
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "");
}

function sanitize(event: LogEvent): LogEvent {
  const fields: Fields = {};
  for (const [key, value] of Object.entries(event.fields)) {
    fields[clean(key)] = typeof value === "string" ? clean(value) : value;
  }
  return {
    ...event,
    message: clean(event.message),
    fields,
    ctx: event.ctx && {
      req: clean(event.ctx.req),
      conv: event.ctx.conv === undefined ? undefined : clean(event.ctx.conv),
      route: clean(event.ctx.route),
    },
  };
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
  const chars = Array.from(text);
  const cut =
    chars.length > QUOTE_LIMIT
      ? `${chars.slice(0, QUOTE_LIMIT).join("")}…`
      : text;
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
  const style =
    event.quote === "shopper"
      ? BOLD
      : event.quote === "model"
        ? ITALIC
        : undefined;
  const back = style ? `\x1b[${style}m` : "";
  const sym = (code: string, ch: string) =>
    `${RESET}\x1b[${code}m${ch}${RESET}${back}`;
  const symbols = text
    .replaceAll("⚠", sym(YELLOW, "⚠"))
    .replaceAll("✓", sym(GREEN, "✓"))
    .replaceAll("✗", sym(RED, "✗"));
  return style ? paint(style, symbols, true) : symbols;
}

export function formatPretty(
  raw: LogEvent,
  { color }: { color: boolean },
): string {
  const event = sanitize(raw);
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

export function formatJson(raw: LogEvent): string {
  const event = sanitize(raw);
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
