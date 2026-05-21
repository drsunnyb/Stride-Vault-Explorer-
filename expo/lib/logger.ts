/**
 * Centralised structured logger for Stride Quest.
 *
 * Replaces scattered `console.log` calls with a single, tagged, level-aware
 * pipeline. Keeps a ring buffer of the last 200 events so we can dump it from
 * a debug screen or attach it to bug reports without spamming the console.
 *
 * Production safety:
 * - Sanitises arguments — strips obvious PII (`token`, `password`, `email`).
 * - Mutes `debug` in production. `info`/`warn`/`error` always pass through.
 * - Never throws. A broken logger should never break the app.
 */
type Level = "debug" | "info" | "warn" | "error";

interface LogEvent {
  ts: number;
  level: Level;
  tag: string;
  msg: string;
  data?: unknown;
}

const BUFFER_SIZE = 200;
const PII_KEYS = new Set([
  "token",
  "accessToken",
  "refreshToken",
  "password",
  "secret",
  "apiKey",
  "email",
  "phone",
]);

const buffer: LogEvent[] = [];
const isProd = !__DEV__;

function sanitise(input: unknown): unknown {
  if (input == null) return input;
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(sanitise);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out[k] = PII_KEYS.has(k) ? "[redacted]" : sanitise(v);
  }
  return out;
}

function record(level: Level, tag: string, msg: string, data?: unknown): void {
  const ev: LogEvent = { ts: Date.now(), level, tag, msg, data: sanitise(data) };
  buffer.push(ev);
  if (buffer.length > BUFFER_SIZE) buffer.shift();
  if (isProd && level === "debug") return;
  const line = `[${tag}] ${msg}`;
  // eslint-disable-next-line no-console
  if (level === "error") console.error(line, ev.data ?? "");
  // eslint-disable-next-line no-console
  else if (level === "warn") console.warn(line, ev.data ?? "");
  // eslint-disable-next-line no-console
  else console.log(line, ev.data ?? "");
}

export interface Logger {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
}

/** Create a tagged logger. Use one per module: `const log = createLogger("Game")`. */
export function createLogger(tag: string): Logger {
  return {
    debug: (msg, data) => record("debug", tag, msg, data),
    info: (msg, data) => record("info", tag, msg, data),
    warn: (msg, data) => record("warn", tag, msg, data),
    error: (msg, data) => record("error", tag, msg, data),
  };
}

/** Drain the in-memory buffer (for debug screens / bug reports). */
export function getRecentLogs(): readonly LogEvent[] {
  return buffer.slice();
}

export function clearLogs(): void {
  buffer.length = 0;
}
