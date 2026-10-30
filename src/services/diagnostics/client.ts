/** Bounded, offline-first diagnostics. No native imports or network on callers. */
export type Detail = Record<
  string,
  string | number | boolean | null | undefined
>;
export type Breadcrumb = {
  at: string;
  event: string;
  detail: Record<string, string>;
};
export type DiagnosticSink = {
  log: (line: string) => void;
  context: (values: Record<string, string>) => void;
  error: (error: Error, scope: string) => void;
};
const KEYS = new Set([
  "screen",
  "levelId",
  "gridSize",
  "moves",
  "remaining",
  "status",
  "preview",
  "width",
  "height",
  "density",
  "fontScale",
  "appVersion",
  "buildNumber",
  "buildType",
  "platform",
  "osVersion",
  "device",
  "linked",
  "saveReady",
  "sound",
  "music",
  "haptics",
  "musicVolume",
  "adShowing",
  "adStatus",
  "levelCount",
  "amount",
  "reason",
  "provider",
  "seconds",
  "code",
  "scope",
  "previousCrash",
  "audioReady",
  "nativeFeedback",
  "completionVisible",
]);
export function safeDetails(values: Detail): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!KEYS.has(key) || value === null || value === undefined) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = String(Math.round(value * 100) / 100);
    } else if (typeof value === "boolean") {
      result[key] = String(value);
    } else if (
      typeof value === "string" &&
      /^[a-zA-Z0-9_. /:+-]{1,80}$/.test(value) &&
      !value.includes("://")
    ) {
      result[key] = value;
    }
  }
  return result;
}
export function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (
    typeof code === "string" &&
    /^(auth|firestore|storage|ads|network)\/[a-z-]{1,45}$/.test(code)
  )
    return code;
  const name = error instanceof Error ? error.name : "";
  return [
    "TypeError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "Error",
  ].includes(name)
    ? name
    : "unknown";
}
let sink: DiagnosticSink | null = null;
let context: Record<string, string> = {};
const recent: Breadcrumb[] = [];
const remoteRecent: Breadcrumb[] = [];
const seenIssues = new Set<string>();
const pendingIssues: Array<{ error: Error; scope: string }> = [];
let remoteReporting = true;
let deletionReset: (() => void) | undefined;
export function registerDiagnosticReset(reset: () => void): void {
  deletionReset = reset;
}
export function resetDiagnosticsForDeletion(): void {
  clearDiagnostics();
  deletionReset?.();
}
export function setRemoteReporting(enabled: boolean): void {
  remoteReporting = enabled;
  if (!enabled) {
    pendingIssues.length = 0;
    remoteRecent.length = 0;
    seenIssues.clear();
  }
}
function attempt(action: () => void): void {
  try {
    action();
  } catch {
    /* Diagnostics cannot break the game. */
  }
}
export function setDiagnosticSink(next: DiagnosticSink | null): void {
  sink = next;
  if (!next) return;
  attempt(() => next.context(context));
  for (const item of remoteRecent)
    attempt(() => next.log(JSON.stringify(item)));
  for (const item of pendingIssues.splice(0))
    attempt(() => next.error(item.error, item.scope));
}
export function diagnosticContext(values: Detail): void {
  const safe = safeDetails(values);
  const changed = Object.fromEntries(
    Object.entries(safe).filter(([key, value]) => context[key] !== value)
  );
  if (!Object.keys(changed).length) return;
  context = { ...context, ...changed };
  if (sink) attempt(() => sink!.context(changed));
}
export function breadcrumb(event: string, detail: Detail = {}): void {
  if (!/^[a-z][a-z0-9_.]{0,47}$/.test(event)) return;
  const item = {
    at: new Date().toISOString(),
    event,
    detail: safeDetails(detail),
  };
  recent.push(item);
  if (recent.length > 50) recent.shift();
  if (remoteReporting) {
    remoteRecent.push(item);
    if (remoteRecent.length > 50) remoteRecent.shift();
  }
  if (sink) attempt(() => sink!.log(JSON.stringify(item)));
}
/** Drop raw messages (SDK errors can contain email/UID/URLs). Keep frame locations. */
export function reportIssue(scope: string, cause: unknown): void {
  if (!/^[a-z][a-z0-9_.]{0,47}$/.test(scope)) return;
  const code = errorCode(cause);
  const key = `${scope}:${code}`;
  breadcrumb("issue", { scope, code });
  if (!remoteReporting) return;
  // Expected offline/cancel outcomes remain breadcrumbs rather than dashboard noise.
  if (
    [
      "auth/network-request-failed",
      "firestore/unavailable",
      "firestore/deadline-exceeded",
      "auth/user-cancelled",
    ].includes(code)
  )
    return;
  if (seenIssues.has(key) || seenIssues.size >= 20) return;
  seenIssues.add(key);
  const error = new Error(key);
  error.name = "HandledGameIssue";
  if (cause instanceof Error && cause.stack) {
    const frames = cause.stack
      .split("\n")
      .slice(1)
      .filter((line) => /^\s*at\s/.test(line))
      .slice(0, 24)
      .map((line) =>
        line
          .replace(/https?:\/\/[^\s)]+/g, "[remote-frame]")
          .replace(/[^\s@]+@[^\s]+/g, "[redacted]")
          .slice(0, 240)
      );
    if (frames.length)
      error.stack = `${error.name}: ${key}\n${frames.join("\n")}`;
  }
  if (sink) attempt(() => sink!.error(error, scope));
  else {
    pendingIssues.push({ error, scope });
    if (pendingIssues.length > 20) pendingIssues.shift();
  }
}
export function diagnosticSnapshot() {
  return {
    context: { ...context },
    recent: recent.map((item) => ({ ...item, detail: { ...item.detail } })),
  };
}
export function clearDiagnostics(): void {
  sink = null;
  context = {};
  recent.length = 0;
  remoteRecent.length = 0;
  seenIssues.clear();
  pendingIssues.length = 0;
}
