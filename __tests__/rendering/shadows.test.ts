const mockSurface = jest.fn();
jest.mock("@shopify/react-native-skia", () => ({
  BlurStyle: { Normal: 0 },
  Skia: {
    Surface: { Make: (...args: unknown[]) => mockSurface(...args) },
    Paint: () => ({
      setColor: jest.fn(),
      setAntiAlias: jest.fn(),
      setMaskFilter: jest.fn(),
      dispose: jest.fn(),
    }),
    Color: (value: string) => value,
    MaskFilter: { MakeBlur: () => ({ dispose: jest.fn() }) },
    XYWHRect: (...args: number[]) => args,
    RRectXY: (...args: unknown[]) => args,
  },
}));
import { vehicleShadow } from "../../src/game/rendering/shadows";

it("bakes each supported footprint once and shares its image across cars/levels", () => {
  const canvas = { clear: jest.fn(), drawRRect: jest.fn() };
  const dispose = jest.fn();
  mockSurface.mockImplementation(() => ({
    getCanvas: () => canvas,
    flush: jest.fn(),
    dispose,
    makeImageSnapshot: () => ({ texture: {} }),
  }));
  for (const [w, h] of [
    [1, 2],
    [2, 1],
    [1, 3],
    [3, 1],
  ]) {
    const first = vehicleShadow(w, h);
    expect(first).not.toBeNull();
    for (let move = 0; move < 50; move++) {
      expect(vehicleShadow(w, h)).toBe(first);
    }
  }
  expect(mockSurface).toHaveBeenCalledTimes(4);
  expect(canvas.drawRRect).toHaveBeenCalledTimes(4);
  expect(dispose).toHaveBeenCalledTimes(4);
  expect(vehicleShadow(2, 2)).toBeNull();
  expect(mockSurface).toHaveBeenCalledTimes(4);
});
