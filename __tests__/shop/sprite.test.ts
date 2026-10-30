jest.mock("@shopify/react-native-skia", () => ({ Skia: {} }));
import { spriteKey, equippedSpriteKey } from "../../src/game/rendering/sprites";
import type { Vehicle } from "../../src/game/models/Vehicle";
it("changes only red compact-car artwork and keeps vehicle data untouched", () => {
  const car = { type: "car", color: "red" } as Vehicle;
  expect(spriteKey(car, "red_racer")).toBe("red_racer");
  expect(spriteKey(car, "default")).toBe("car_red");
  expect(spriteKey(car, "unknown")).toBe("car_red");
  expect(spriteKey({ ...car, color: "blue" }, "red_racer")).toBe("car_blue");
  expect(spriteKey({ ...car, type: "truck" }, "red_racer")).toBe("truck_red");
  expect(spriteKey({ ...car, type: "bus" }, "red_racer")).toBe("bus_red");
  expect(spriteKey({ ...car, type: "ambulance" }, "red_racer")).toBe(
    "ambulance"
  );
  expect(car).toEqual({ type: "car", color: "red" });
});

it.each(["red", "blue", "yellow", "green", "purple", "orange"])(
  "preserves the mixed palette with an override applied only to red cars: %s",
  (color) => {
    const slots = { "car:red": "red_racer" as const };
    const vehicle = { type: "car", color } as Vehicle;
    expect(equippedSpriteKey(vehicle, slots)).toBe(
      color === "red" ? "red_racer" : `car_${color}`
    );
    expect(equippedSpriteKey({ ...vehicle, type: "truck" }, slots)).toBe(
      `truck_${color}`
    );
    expect(equippedSpriteKey({ ...vehicle, type: "bus" }, slots)).toBe(
      `bus_${color}`
    );
    expect(equippedSpriteKey({ ...vehicle, type: "police" }, slots)).toBe(
      "police"
    );
    expect(spriteKey(vehicle, "classic_blue")).toBe(`car_${color}`);
    expect(vehicle).toEqual({ type: "car", color });
  }
);
