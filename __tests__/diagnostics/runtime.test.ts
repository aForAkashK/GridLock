const mockValues = new Map<string, string | boolean>();
const mockSDK = {};
const mockCollection = jest.fn<Promise<null>, unknown[]>(async () => null);
const mockAttributes = jest.fn<Promise<null>, unknown[]>(async () => null);
const mockUser = jest.fn<Promise<null>, unknown[]>(async () => null);
const mockDelete = jest.fn<Promise<void>, unknown[]>(async () => undefined);
const mockShare = jest.fn<Promise<{ action: string }>, unknown[]>(async () => ({
  action: "dismissedAction",
}));
const mockSubscribe = jest.fn<() => void, unknown[]>(() => jest.fn());
jest.mock("@react-native-firebase/crashlytics", () => ({
  getCrashlytics: () => mockSDK,
  log: jest.fn(),
  recordError: jest.fn(),
  setAttributes: (...args: unknown[]) => mockAttributes(...args),
  setUserId: (...args: unknown[]) => mockUser(...args),
  setCrashlyticsCollectionEnabled: (...args: unknown[]) =>
    mockCollection(...args),
  deleteUnsentReports: (...args: unknown[]) => mockDelete(...args),
  didCrashOnPreviousExecution: async () => false,
  crash: jest.fn(),
}));
jest.mock("react-native", () => ({
  NativeModules: {
    GridLockFeedback: {
      appVersion: "1.0",
      buildNumber: "1",
      buildType: "qa",
      deviceModel: "Test phone",
    },
  },
  Platform: { OS: "android", Version: 35 },
  Dimensions: {
    get: () => ({ width: 360, height: 800, scale: 3, fontScale: 1 }),
    addEventListener: () => ({ remove: jest.fn() }),
  },
  AppState: { addEventListener: () => ({ remove: jest.fn() }) },
  Share: { share: (...args: unknown[]) => mockShare(...args) },
}));
jest.mock("../../src/services/storage/mmkv", () => ({
  storage: {
    getString: (key: string) => mockValues.get(key),
    getBoolean: (key: string) => mockValues.get(key),
    set: (key: string, value: string | boolean) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  },
  StorageKeys: {
    diagnosticsId: "id",
    crashReportsEnabled: "enabled",
    diagnosticsDiscardPending: "discard",
  },
  getBool: (key: string, fallback: boolean) => mockValues.get(key) ?? fallback,
}));
jest.mock("../../src/state/gameStore", () => ({
  useGameStore: {
    getState: () => ({
      level: { id: 15, gridSize: 6 },
      state: { moveCount: 4, vehicles: [1, 2], status: "playing" },
    }),
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
  },
}));
jest.mock("../../src/state/settingsStore", () => ({
  useSettingsStore: {
    getState: () => ({
      soundEnabled: true,
      musicEnabled: false,
      hapticsEnabled: true,
      musicVolume: 0.3,
    }),
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
  },
}));
jest.mock("../../src/state/accountStore", () => ({
  useAccountStore: {
    getState: () => ({
      user: {
        uid: "PRIVATE_UID",
        email: "private@example.com",
        hasRecoverableIdentity: true,
      },
    }),
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
  },
}));
import {
  startDiagnostics,
  supportCode,
  supportReport,
  shareSupportReport,
  setCrashReporting,
  resetDiagnosticIdentity,
} from "../../src/services/diagnostics/runtime";
import { clearDiagnostics } from "../../src/services/diagnostics/client";
const settle = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};
beforeEach(() => {
  jest.useFakeTimers();
  mockValues.clear();
  jest.clearAllMocks();
  clearDiagnostics();
});
afterEach(() => jest.useRealTimers());
it("shares useful app/game/display context without account identity or credentials", async () => {
  const stop = startDiagnostics();
  const report = supportReport();
  expect(report).toContain("Support code: FE-");
  expect(report).toContain('"levelId": "15"');
  expect(report).toContain('"fontScale": "1"');
  expect(report).toContain('"buildNumber": "1"');
  expect(report).not.toContain("PRIVATE_UID");
  expect(report).not.toContain("private@example.com");
  await shareSupportReport();
  expect(mockShare).toHaveBeenCalledWith(
    expect.objectContaining({
      message: expect.stringContaining("What happened?"),
    })
  );
  stop();
  await settle();
});
it("keeps the support label stable and rotates it after successful deletion cleanup", async () => {
  const first = supportCode();
  expect(supportCode()).toBe(first);
  resetDiagnosticIdentity();
  await settle();
  expect(mockCollection).toHaveBeenCalledWith(mockSDK, false);
  expect(mockUser).toHaveBeenCalledWith(mockSDK, "");
  expect(mockDelete).toHaveBeenCalled();
  expect(supportCode()).not.toBe(first);
});
it("applies opt-out without enabling collection and drops unsent reports in a dev session", async () => {
  mockValues.set("enabled", false);
  const stop = startDiagnostics();
  jest.advanceTimersByTime(20);
  await settle();
  expect(mockCollection).toHaveBeenCalledWith(mockSDK, false);
  expect(mockCollection).not.toHaveBeenCalledWith(mockSDK, true);
  expect(mockDelete).toHaveBeenCalled();
  setCrashReporting(false);
  await settle();
  expect(mockValues.get("enabled")).toBe(false);
  stop();
});
