import { NativeModules } from "react-native";
import {
  hasBestValue,
  loadCoinPackPrices,
  type CoinPackPrices,
} from "../../src/services/purchases/coinCatalog";

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: {
    GridLockBilling: { loadPrices: jest.fn(), cancelPriceQuery: jest.fn() },
  },
}));

function price(amount: number, currency = "INR") {
  return { formatted: `₹${amount}.00`, currency, micros: amount * 1_000_000 };
}

const indiaPrices: CoinPackPrices = {
  coins_300: price(29),
  coins_900: price(79),
  coins_1800: price(149),
  coins_3300: price(249),
};

it("loads the four standard Play offers and preserves Play's formatted prices", async () => {
  const loadPrices = NativeModules.GridLockBilling.loadPrices as jest.Mock;
  loadPrices.mockResolvedValueOnce(indiaPrices);
  await expect(loadCoinPackPrices()).resolves.toEqual(indiaPrices);
  expect(loadPrices).toHaveBeenCalledWith(
    ["coins_300", "coins_900", "coins_1800", "coins_3300"],
    "buy"
  );
});

it("shows best value only when the largest pack has the lowest comparable cost per coin", () => {
  expect(hasBestValue(indiaPrices)).toBe(true);
  expect(hasBestValue({ ...indiaPrices, coins_300: price(20) })).toBe(false);
  expect(hasBestValue({ ...indiaPrices, coins_300: price(29, "USD") })).toBe(
    false
  );
  expect(hasBestValue({ ...indiaPrices, coins_900: undefined })).toBe(false);
});
