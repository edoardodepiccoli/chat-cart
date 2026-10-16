import {
  clean,
  formatJson,
  formatPretty,
  type Fields,
  type Level,
  type LogEvent,
  type Tag,
} from "./format";

export type LogOptions = {
  detail?: string;
  quote?: "shopper" | "model";
  depth?: number;
  edge?: "start" | "end";
  payload?: unknown;
};

const RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let sink = (line: string) => {
  process.stdout.write(`${line}\n`);
};
let contextProvider: () => LogEvent["ctx"] = () => undefined;

export function setSink(next: (line: string) => void): () => void {
  const previous = sink;
  sink = next;
  return () => {
    sink = previous;
  };
}

export function setContextProvider(provider: () => LogEvent["ctx"]) {
  contextProvider = provider;
}

function minLevel(): Level {
  const value = process.env.LOG_LEVEL;
  return value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error"
    ? value
    : "info";
}

function wantsJson(): boolean {
  const value = process.env.LOG_FORMAT;
  if (value === "json") return true;
  if (value === "pretty") return false;
  return process.env.NODE_ENV === "production";
}

function wantsColor(): boolean {
  if (process.env.NO_COLOR) return false;
  const force = process.env.FORCE_COLOR;
  if (force !== undefined && force !== "" && force !== "0" && force !== "false")
    return true;
  return Boolean(process.stdout.isTTY);
}

function write(
  level: Level,
  tag: Tag,
  message: string,
  fields: Fields,
  options: LogOptions,
) {
  if (RANK[level] < RANK[minLevel()]) return;
  try {
    const event: LogEvent = {
      time: new Date(),
      level,
      tag,
      message,
      detail: options.detail,
      quote: options.quote,
      depth: options.depth ?? 0,
      edge: options.edge,
      fields,
      ctx: contextProvider(),
      payload: level === "debug" ? options.payload : undefined,
    };
    sink(
      wantsJson()
        ? formatJson(event)
        : formatPretty(event, { color: wantsColor() }),
    );
  } catch {
    try {
      process.stderr.write(
        `${level} ${tag} ${clean(String(message))} (logging failed)\n`,
      );
    } catch {
      // nothing left to do
    }
  }
}

const make =
  (level: Level) =>
  (tag: Tag, message: string, fields: Fields = {}, options: LogOptions = {}) =>
    write(level, tag, message, fields, options);

export const log = {
  debug: make("debug"),
  info: make("info"),
  warn: make("warn"),
  error: make("error"),
};
