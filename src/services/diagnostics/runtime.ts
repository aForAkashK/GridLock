/** Native adapter; initialized after first paint, never awaited by gameplay. */
import {
  AppState,
  Dimensions,
  NativeModules,
  Platform,
  Share,
} from "react-native";
import {
  getCrashlytics,
  log,
  recordError,
  setAttributes,
  setUserId,
  setCrashlyticsCollectionEnabled,
  deleteUnsentReports,
  didCrashOnPreviousExecution,
  crash,
} from "@react-native-firebase/crashlytics";
import { storage, StorageKeys, getBool } from "../storage/mmkv";
import { useGameStore } from "../../state/gameStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useAccountStore } from "../../state/accountStore";
import {
  breadcrumb,
  clearDiagnostics,
  diagnosticContext,
  diagnosticSnapshot,
  registerDiagnosticReset,
  reportIssue,
  setDiagnosticSink,
  setRemoteReporting,
} from "./client";

const native = NativeModules.GridLockFeedback;
let session = 0;
let running = false;
let active = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let lines: string[] = [];
let attributes: Record<string, string> = {};
let collectionQueue = Promise.resolve();
export function crashReportingEnabled(): boolean {
  return getBool(StorageKeys.crashReportsEnabled, true);
}
export function supportCode(): string {
  let id = storage.getString(StorageKeys.diagnosticsId);
  if (!id) {
    // Correlation label only: not an auth credential, never synced to a cloud save.
    id = `FE-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`.toUpperCase();
    storage.set(StorageKeys.diagnosticsId, id);
  }
  return id;
}
function safely(promise: Promise<unknown>): void {
  promise.catch(() => {});
}
function flush(): void {
  clearTimeout(flushTimer);
  flushTimer = undefined;
  if (!active) {
    lines = [];
    attributes = {};
    return;
  }
  try {
    const sdk = getCrashlytics();
    const values = attributes;
    attributes = {};
    if (Object.keys(values).length) safely(setAttributes(sdk, values));
    for (const line of lines.splice(0)) log(sdk, line);
  } catch {
    /* Missing/unavailable SDK must not affect the app. */
  }
}
function scheduleFlush(): void {
  if (!flushTimer) flushTimer = setTimeout(flush, 250);
}
function applyCollection(): void {
  const revision = ++session;
  active = false;
  setDiagnosticSink(null);
  lines = [];
  attributes = {};
  collectionQueue = collectionQueue
    .catch(() => {})
    .then(async () => {
      if (revision !== session || !running) return;
      const sdk = getCrashlytics();
      const enabled = crashReportingEnabled() && !__DEV__;
      setRemoteReporting(enabled);
      if (storage.getBoolean(StorageKeys.diagnosticsDiscardPending)) {
        await setCrashlyticsCollectionEnabled(sdk, false);
        await deleteUnsentReports(sdk);
        storage.remove(StorageKeys.diagnosticsDiscardPending);
      }
      await setCrashlyticsCollectionEnabled(sdk, enabled);
      if (revision !== session || !running) return;
      await setUserId(sdk, enabled ? supportCode() : "");
      if (!enabled) {
        await deleteUnsentReports(sdk);
        return;
      }
      if (revision !== session || !running) return;
      active = true;
      setDiagnosticSink({
        log: (line) => {
          lines.push(line);
          if (lines.length > 50) lines.shift();
          scheduleFlush();
        },
        context: (values) => {
          attributes = { ...attributes, ...values };
          scheduleFlush();
        },
        error: (error, scope) => {
          flush();
          recordError(sdk, error, scope);
        },
      });
      safely(
        didCrashOnPreviousExecution(sdk).then((previousCrash) =>
          diagnosticContext({ previousCrash })
        )
      );
      // Test trigger is read only in native QA builds. Never exposed in production UI.
      if (native?.qaEnabled === true && native?.diagnosticsTest) {
        const test = await native.diagnosticsTest();
        if (test === "nonfatal")
          reportIssue("qa.nonfatal", new Error("Controlled QA diagnostic"));
        if (test === "crash")
          setTimeout(() => {
            flush();
            crash(sdk);
          }, 3000);
        if (test === "jscrash")
          setTimeout(() => {
            throw new Error("Controlled QA JavaScript crash");
          }, 3000);
      }
    })
    .catch(() => {
      /* Local support reports remain available offline. */
    });
}
export function setCrashReporting(enabled: boolean): void {
  storage.set(StorageKeys.crashReportsEnabled, enabled);
  if (!enabled) {
    storage.set(StorageKeys.diagnosticsDiscardPending, true);
    setRemoteReporting(false);
  }
  applyCollection();
}
function gameContext(): void {
  const game = useGameStore.getState();
  diagnosticContext({
    levelId: game.level?.id ?? 0,
    gridSize: game.level?.gridSize ?? 0,
    moves: game.state?.moveCount ?? 0,
    remaining: game.state?.vehicles.length ?? 0,
    status: game.state?.status ?? "none",
  });
}
function settingsContext(): void {
  const value = useSettingsStore.getState();
  diagnosticContext({
    sound: value.soundEnabled,
    music: value.musicEnabled,
    haptics: value.hapticsEnabled,
    musicVolume: value.musicVolume,
  });
}
function displayContext(): void {
  const window = Dimensions.get("window");
  diagnosticContext({
    width: window.width,
    height: window.height,
    density: window.scale,
    fontScale: window.fontScale,
  });
}
export function startDiagnostics(): () => void {
  running = true;
  diagnosticContext({
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    appVersion: native?.appVersion ?? "unknown",
    buildNumber: native?.buildNumber ?? "unknown",
    buildType: native?.buildType ?? (__DEV__ ? "debug" : "release"),
    device: native?.deviceModel ?? Platform.OS,
  });
  displayContext();
  gameContext();
  settingsContext();
  breadcrumb("app.started");
  const frame = requestAnimationFrame(() => applyCollection());
  const gameSub = useGameStore.subscribe((next, previous) => {
    if (next.state === previous.state) return;
    gameContext();
    if (next.level !== previous.level)
      breadcrumb("game.loaded", { levelId: next.level?.id });
    else if (next.state?.status === "won" && previous.state?.status !== "won")
      breadcrumb("game.won", { moves: next.state.moveCount });
    else if (next.state?.moveCount !== previous.state?.moveCount)
      breadcrumb("game.move", { moves: next.state?.moveCount });
  });
  const settingsSub = useSettingsStore.subscribe(settingsContext);
  const accountSub = useAccountStore.subscribe((value) =>
    diagnosticContext({ linked: value.user?.hasRecoverableIdentity ?? false })
  );
  diagnosticContext({
    linked: useAccountStore.getState().user?.hasRecoverableIdentity ?? false,
  });
  const dimensionsSub = Dimensions.addEventListener("change", displayContext);
  const stateSub = AppState.addEventListener("change", (state) => {
    breadcrumb(`app.${state}`);
    flush();
  });
  return () => {
    running = false;
    session++;
    active = false;
    setDiagnosticSink(null);
    cancelAnimationFrame(frame);
    clearTimeout(flushTimer);
    flushTimer = undefined;
    gameSub();
    settingsSub();
    accountSub();
    dimensionsSub.remove();
    stateSub.remove();
  };
}
/** Clear local correlation and unsent reports after successful account deletion. */
export function resetDiagnosticIdentity(): void {
  active = false;
  session++;
  clearDiagnostics();
  lines = [];
  attributes = {};
  setRemoteReporting(false);
  storage.remove(StorageKeys.diagnosticsId);
  storage.set(StorageKeys.diagnosticsDiscardPending, true);
  collectionQueue = collectionQueue
    .catch(() => {})
    .then(async () => {
      const sdk = getCrashlytics();
      await setCrashlyticsCollectionEnabled(sdk, false);
      await setUserId(sdk, "");
      await deleteUnsentReports(sdk);
    })
    .catch(() => {});
  // New diagnostics begin with the next app session, never under the deleted code.
}
registerDiagnosticReset(resetDiagnosticIdentity);
export function supportReport(): string {
  displayContext();
  settingsContext();
  const snapshot = diagnosticSnapshot();
  return [
    "Freeway Escape — issue report",
    `Support code: ${supportCode()}`,
    `Generated: ${new Date().toISOString()}`,
    `Automatic crash reports: ${crashReportingEnabled() ? "on" : "off"}`,
    "",
    "What happened? Please describe the steps, expected result and actual result.",
    "",
    "App / device / last game context:",
    JSON.stringify(snapshot.context, null, 2),
    "",
    "Recent actions (this session only):",
    ...snapshot.recent.map((item) => JSON.stringify(item)),
    "",
    "No save file, email, login token or advertising identifier is attached. Review before sharing.",
    "Send to akssoft.feedback@gmail.com.",
  ].join("\n");
}
export async function shareSupportReport(): Promise<void> {
  await Share.share({
    title: "Freeway Escape issue report",
    message: supportReport(),
  });
}
