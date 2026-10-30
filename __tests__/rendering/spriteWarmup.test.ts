jest.mock("@shopify/react-native-skia", () => ({
  Skia: {
    Data: { fromURI: jest.fn(async () => ({})) },
    Image: { MakeImageFromEncoded: jest.fn(() => ({})) },
  },
}));
import { Image } from "react-native";
import { Skia } from "@shopify/react-native-skia";
import {
  warmVehicleImages,
  spriteDiagnostics,
} from "../../src/game/rendering/sprites";
import type { Vehicle } from "../../src/game/models/Vehicle";
const vehicle = (color: string) => ({ type: "car", color } as Vehicle);

beforeAll(() => {
  jest
    .spyOn(Image, "resolveAssetSource")
    .mockReturnValue({ uri: "local", width: 1, height: 1, scale: 1 });
});
afterAll(() => jest.restoreAllMocks());

it("shares in-flight and decoded sprites between repeated upcoming-board requests", async () => {
  const decode = jest.mocked(Skia.Data.fromURI);
  const before = decode.mock.calls.length;
  const vehicles = [vehicle("red"), vehicle("red"), vehicle("blue")];
  await Promise.all([
    warmVehicleImages(vehicles, {}),
    warmVehicleImages(vehicles, {}),
  ]);
  expect(decode.mock.calls.length - before).toBe(2);
  await warmVehicleImages(vehicles, {});
  expect(decode.mock.calls.length - before).toBe(2);
  expect(spriteDiagnostics().decoded).toEqual(
    expect.arrayContaining(["car_red", "car_blue"])
  );
});

it("stops scheduling new decodes after leaving Home", async () => {
  let active = true;
  jest.mocked(Skia.Data.fromURI).mockImplementationOnce(async () => {
    active = false;
    return {} as never;
  });
  await warmVehicleImages(
    [vehicle("green"), vehicle("purple")],
    {},
    () => active
  );
  expect(spriteDiagnostics().decoded).toContain("car_green");
  expect(spriteDiagnostics().decoded).not.toContain("car_purple");
});

it("does not poison a later retry after optional warm-up fails", async () => {
  jest
    .mocked(Skia.Data.fromURI)
    .mockRejectedValueOnce(new Error("decode interrupted"));
  await warmVehicleImages([vehicle("orange")], {});
  expect(spriteDiagnostics().loading).not.toContain("car_orange");
  await warmVehicleImages([vehicle("orange")], {});
  expect(spriteDiagnostics().decoded).toContain("car_orange");
});
