import { NativeModules } from "react-native";
import {
  buyCoinPack,
  recoverCoinPurchases,
} from "../../src/services/purchases/playCoinPurchases";
import { commitCoinTransaction } from "../../src/services/coins/transaction";
import type { PlayPurchaseResult } from "../../src/services/purchases/coinCatalog";

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: {
    GridLockBilling: {
      checkoutConfigured: true,
      buy: jest.fn(),
      recover: jest.fn(),
      consume: jest.fn(),
    },
  },
}));

let mockUid = "player-a";
const mockReceipts = new Set<string>();

jest.mock("../../src/services/auth/authService", () => ({
  getCurrentUid: () => mockUid,
}));
jest.mock("../../src/services/auth/saveReadiness", () => ({
  isSaveReady: () => true,
}));
jest.mock("../../src/services/storage/mmkv", () => ({
  StorageKeys: {},
  storage: { getString: () => undefined },
  getNumber: () => 0,
}));
jest.mock("../../src/services/coins/coinService", () => ({
  coinService: { getBalance: () => 100 },
}));
jest.mock("../../src/services/coins/transaction", () => ({
  commitCoinTransaction: jest.fn(({ playReceiptId }) =>
    mockReceipts.add(playReceiptId)
  ),
  hasPlayCoinReceipt: (id: string) => mockReceipts.has(id),
}));
jest.mock("../../src/state/playerStore", () => ({
  usePlayerStore: { getState: () => ({ hydrateFromStorage: jest.fn() }) },
}));
jest.mock("../../src/services/sync/syncQueue", () => ({
  queueSync: jest.fn(),
  flush: jest.fn(),
}));

const billing = NativeModules.GridLockBilling;
const receiptId = "a".repeat(64);
const completed: PlayPurchaseResult = {
  status: "purchased",
  purchases: [{ productId: "coins_300", token: "example", receiptId }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUid = "player-a";
  mockReceipts.clear();
});

it("journals the credit before consuming and retries an already-owned pack without crediting it again", async () => {
  billing.buy
    .mockResolvedValueOnce(completed)
    .mockResolvedValueOnce({ status: "owned" });
  billing.recover.mockResolvedValueOnce(completed);
  billing.consume
    .mockImplementationOnce(async () => {
      expect(mockReceipts.has(receiptId)).toBe(true);
      throw new Error("interrupted");
    })
    .mockResolvedValueOnce(undefined);

  await expect(buyCoinPack("coins_300")).resolves.toBe("300 coins added.");
  await expect(buyCoinPack("coins_300")).resolves.toBe(
    "Your coins were already added."
  );
  expect(commitCoinTransaction).toHaveBeenCalledTimes(1);
  expect(billing.consume).toHaveBeenCalledTimes(2);
});

it("waits for Google Play to complete pending payments", async () => {
  billing.buy.mockResolvedValueOnce({ status: "pending" });
  await expect(buyCoinPack("coins_300")).resolves.toMatch("Payment is pending");
  expect(commitCoinTransaction).not.toHaveBeenCalled();
  expect(billing.consume).not.toHaveBeenCalled();
});

it("recovers a completed purchase and reports the credited amount once", async () => {
  billing.recover.mockResolvedValue(completed);
  billing.consume.mockResolvedValue(undefined);
  await expect(recoverCoinPurchases()).resolves.toBe("300 coins added.");
  await expect(recoverCoinPurchases()).resolves.toBe("");
  expect(commitCoinTransaction).toHaveBeenCalledTimes(1);
  expect(billing.consume).toHaveBeenCalledTimes(2);
});

it("doesn't grant a receipt to a save selected while checkout was open", async () => {
  billing.buy.mockImplementationOnce(async () => {
    mockUid = "player-b";
    return completed;
  });
  await expect(buyCoinPack("coins_300")).resolves.toMatch("checked again");
  expect(commitCoinTransaction).not.toHaveBeenCalled();
  expect(billing.consume).not.toHaveBeenCalled();
});
