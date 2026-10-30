let mockAppChange: (state: string) => void;
const mockRemove = jest.fn();
jest.mock("react-native", () => ({
  NativeModules: {
    GridLockFeedback: {
      preload: jest.fn(),
      play: jest.fn(),
      haptic: jest.fn(),
      setMusic: jest.fn(),
    },
  },
  AppState: {
    currentState: "active",
    addEventListener: jest.fn((_event, callback) => {
      mockAppChange = callback;
      return { remove: mockRemove };
    }),
  },
}));
jest.mock("../../src/services/storage/mmkv", () => {
  const values = new Map();
  return {
    storage: { set: (key: string, value: unknown) => values.set(key, value) },
    StorageKeys: {
      soundEnabled: "sound",
      musicEnabled: "music",
      musicVolume: "volume",
      hapticsEnabled: "haptics",
    },
    getBool: (_: string, fallback: boolean) => fallback,
    getNumber: (_: string, fallback: number) => fallback,
  };
});
import { NativeModules } from "react-native";
const mockNative = NativeModules.GridLockFeedback;
import { useSettingsStore } from "../../src/state/settingsStore";
import {
  play,
  preloadAll,
  startAudio,
} from "../../src/services/audio/audioService";

describe("native audio lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNative.preload.mockResolvedValue(true);
    useSettingsStore.setState({
      soundEnabled: true,
      musicEnabled: true,
      musicVolume: 0.28,
      hapticsEnabled: true,
    });
  });
  it("pauses on background, restores the latest volume, and detaches on unmount", () => {
    const stop = startAudio();
    expect(mockNative.setMusic).toHaveBeenLastCalledWith(true, 0.28);
    mockAppChange("background");
    expect(mockNative.setMusic).toHaveBeenLastCalledWith(false, 0.28);
    useSettingsStore.getState().setMusicVolume(0.5);
    expect(mockNative.setMusic).toHaveBeenLastCalledWith(false, 0.5);
    mockAppChange("active");
    expect(mockNative.setMusic).toHaveBeenLastCalledWith(true, 0.5);
    stop();
    expect(mockRemove).toHaveBeenCalled();
    expect(mockNative.setMusic).toHaveBeenLastCalledWith(false, 0);
    mockNative.setMusic.mockClear();
    useSettingsStore.getState().toggle("musicEnabled");
    expect(mockNative.setMusic).not.toHaveBeenCalled();
  });
  it("keeps music, effects and haptics independent", async () => {
    await preloadAll();
    const stop = startAudio();
    useSettingsStore.getState().toggle("musicEnabled");
    expect(mockNative.setMusic).toHaveBeenLastCalledWith(false, 0.28);
    play("coin");
    expect(mockNative.play).toHaveBeenLastCalledWith("coin");
    useSettingsStore.getState().toggle("soundEnabled");
    mockNative.play.mockClear();
    play("exit");
    expect(mockNative.play).not.toHaveBeenCalled();
    expect(mockNative.haptic).toHaveBeenLastCalledWith("exit");
    useSettingsStore.getState().toggle("hapticsEnabled");
    mockNative.haptic.mockClear();
    play("tap");
    expect(mockNative.haptic).not.toHaveBeenCalled();
    stop();
  });
  it("bounds and persists volume; ignores nonfinite input", () => {
    useSettingsStore.getState().setMusicVolume(4);
    expect(useSettingsStore.getState().musicVolume).toBe(1);
    useSettingsStore.getState().setMusicVolume(-2);
    expect(useSettingsStore.getState().musicVolume).toBe(0);
    useSettingsStore.getState().setMusicVolume(NaN);
    expect(useSettingsStore.getState().musicVolume).toBe(0);
  });
});
