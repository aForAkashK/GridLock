import { NativeModules, Platform } from "react-native";

export const COIN_PACKS = [
  { id: "coins_300", amount: 300, previewPrice: "₹29" },
  { id: "coins_900", amount: 900, previewPrice: "₹79" },
  { id: "coins_1800", amount: 1800, previewPrice: "₹149" },
  { id: "coins_3300", amount: 3300, previewPrice: "₹249" },
] as const;

export type CoinPackId = (typeof COIN_PACKS)[number]["id"];
type CoinPackPrice = { formatted: string; currency: string; micros: number };
export type CoinPackPrices = Partial<Record<CoinPackId, CoinPackPrice>>;

export function hasBestValue(prices: CoinPackPrices | null): boolean {
  const best = prices?.coins_3300;
  return (
    best != null &&
    best.micros > 0 &&
    COIN_PACKS.every((pack) => {
      if (pack.id === "coins_3300") return true;
      const price = prices?.[pack.id];
      return (
        price != null &&
        best.currency === price.currency &&
        best.micros * pack.amount < price.micros * 3300
      );
    })
  );
}

type BillingCatalog = {
  loadPrices(
    ids: CoinPackId[],
    purchaseOptionId: string
  ): Promise<CoinPackPrices | null>;
  cancelPriceQuery(): void;
  checkoutConfigured?: boolean;
  buy(id: CoinPackId, uid: string): Promise<PlayPurchaseResult>;
  recover(uid: string): Promise<PlayPurchaseResult>;
  consume(token: string): Promise<void>;
};

export type VerifiedPlayPurchase = {
  productId: CoinPackId;
  receiptId: string;
  token: string;
};
export type PlayPurchaseResult = {
  status:
    | "purchased"
    | "pending"
    | "cancelled"
    | "owned"
    | "empty"
    | "invalid"
    | "unavailable";
  purchases?: VerifiedPlayPurchase[];
};

export const playBilling = NativeModules.GridLockBilling as
  | BillingCatalog
  | undefined;

export const hasPlayCatalog = Platform.OS === "android" && playBilling != null;
export const isPlayCheckoutConfigured =
  hasPlayCatalog && playBilling?.checkoutConfigured === true;

export async function loadCoinPackPrices(): Promise<CoinPackPrices> {
  if (!hasPlayCatalog || !playBilling) return {};
  return (
    (await playBilling.loadPrices(
      COIN_PACKS.map((pack) => pack.id),
      "buy"
    )) ?? {}
  );
}

export function cancelCoinPackPrices() {
  playBilling?.cancelPriceQuery();
}
