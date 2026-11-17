import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Platform } from "react-native";
import { LevelCompleteModal } from "../../src/components/LevelCompleteModal";
jest.mock("react-native", () => ({
  Modal: "NativeModal",
  Image: "Image",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
  Platform: { OS: "android" },
  StyleSheet: { create: (styles: unknown) => styles },
  useWindowDimensions: () => ({ width: 360, height: 640 }),
}));
let tree: ReactTestRenderer;
const props = () => ({
  visible: true,
  moveCount: 9,
  parMoves: 9,
  coinsAwarded: 10,
  skipped: false,
  hasNextLevel: true,
  onNext: jest.fn(),
  onReplay: jest.fn(),
  onHome: jest.fn(),
});
const modal = () => tree.root.findByType("NativeModal" as never);
beforeEach(() => {
  jest.useFakeTimers();
  Platform.OS = "android";
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  jest.useRealTimers();
});
it("reveals a native window after the final exit delay and hides again on reset", () => {
  const p = props();
  act(() => {
    tree = create(<LevelCompleteModal {...p} />);
  });
  expect(modal().props.visible).toBe(false);
  act(() => jest.advanceTimersByTime(400));
  expect(modal().props.visible).toBe(true);
  expect(modal().props.hardwareAccelerated).toBe(true);
  act(() => tree.update(<LevelCompleteModal {...p} visible={false} />));
  expect(modal().props.visible).toBe(false);
});
it("dismisses before continuing and handles rapid duplicate taps only once", () => {
  const p = props();
  act(() => {
    tree = create(<LevelCompleteModal {...p} />);
    jest.advanceTimersByTime(400);
  });
  act(() => jest.advanceTimersByTime(400));
  const next = tree.root
    .findAllByType("Pressable" as never)
    .find((n) => n.props.accessibilityLabel === "Next level")!;
  act(() => {
    next.props.onPress();
    next.props.onPress();
  });
  expect(modal().props.visible).toBe(false);
  expect(p.onNext).not.toHaveBeenCalled();
  act(() => jest.runOnlyPendingTimers());
  expect(p.onNext).toHaveBeenCalledTimes(1);
});
it("waits for iOS dismissal before navigation or ad presentation", () => {
  Platform.OS = "ios";
  const p = props();
  act(() => {
    tree = create(<LevelCompleteModal {...p} />);
  });
  act(() => jest.advanceTimersByTime(400));
  act(() => modal().props.onRequestClose());
  expect(p.onHome).not.toHaveBeenCalled();
  act(() => {
    modal().props.onDismiss();
    modal().props.onDismiss();
  });
  expect(p.onHome).toHaveBeenCalledTimes(1);
});
it("cancels a pending reveal when a level is reset before it finishes", () => {
  const p = props();
  act(() => {
    tree = create(<LevelCompleteModal {...p} />);
  });
  act(() => tree.update(<LevelCompleteModal {...p} visible={false} />));
  act(() => jest.runOnlyPendingTimers());
  expect(modal().props.visible).toBe(false);
});

it("keeps the reveal scheduled while completion rewards update the parent props", () => {
  const p = props();
  act(() => {
    tree = create(<LevelCompleteModal {...p} coinsAwarded={0} />);
  });
  act(() => jest.advanceTimersByTime(200));
  act(() => tree.update(<LevelCompleteModal {...p} coinsAwarded={10} />));
  act(() => jest.advanceTimersByTime(200));
  expect(modal().props.visible).toBe(true);
});

it("shows the earned coins alongside a perfect three-star result", () => {
  act(() => {
    tree = create(<LevelCompleteModal {...props()} />);
  });
  act(() => jest.advanceTimersByTime(400));
  expect(
    tree.root.findAllByProps({ accessibilityLabel: "3 of 3 stars" })
  ).toHaveLength(1);
  expect(
    tree.root.findAllByType("Text" as never).map((node) => node.props.children)
  ).toContain("+10 coins earned");
});
