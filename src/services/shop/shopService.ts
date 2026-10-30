import { getJSON, getNumber, storage, StorageKeys } from "../storage/mmkv";
import { coinService } from "../coins/coinService";
import { commitCoinTransaction } from "../coins/transaction";
import { queueSync } from "../sync/syncQueue";
import {
  inventory,
  SKINS,
  ownsChoice,
  appearanceSlot,
  SKIN_COLOURS,
  type SkinColour,
  equippedChoice,
  type EquipmentCategory,
} from "./policy";
export function readInventory() {
  return inventory(
    getJSON(StorageKeys.unlockedSkins, []),
    storage.getString(StorageKeys.selectedSkin),
    undefined,
    getJSON(StorageKeys.skinSlots, undefined)
  );
}
export type PurchaseResult =
  | "purchased"
  | "owned"
  | "unknown"
  | "insufficient"
  | "recovery_pending";
export function buySkin(id: string): PurchaseResult {
  const balance = coinService.getBalance();
  if (storage.getString(StorageKeys.pendingAccountRestore))
    return "recovery_pending";
  const skin = SKINS.find((s) => s.id === id);
  if (!skin) return "unknown";
  const current = readInventory();
  if (ownsChoice(current.owned, id)) return "owned";
  if (balance < skin.price) return "insufficient";
  const versionAfter = getNumber(StorageKeys.syncVersion, 0) + 1;
  commitCoinTransaction({
    versionAfter,
    entry: {
      id: `purchase:${id}:${versionAfter}`,
      at: Date.now(),
      amount: -skin.price,
      balance: balance - skin.price,
      label: `Purchased ${skin.title}`,
    },
    inventoryAfter: inventory(
      [...current.owned, id],
      current.selected,
      undefined,
      current.slots
    ),
  });
  queueSync("skin_purchase");
  return "purchased";
}
export function equipSkin(
  id: string,
  category: EquipmentCategory = "car",
  colour: SkinColour = "red"
): boolean {
  const balance = coinService.getBalance();
  if (storage.getString(StorageKeys.pendingAccountRestore)) return false;
  if (
    !["car", "truck", "bus"].includes(category) ||
    !SKIN_COLOURS.includes(colour)
  )
    return false;
  const current = readInventory(),
    skin = SKINS.find((s) => s.id === id);
  if (!skin || !ownsChoice(current.owned, id)) return false;
  const slot = appearanceSlot(category, colour);
  if (
    id !== "default" &&
    !skin.replacements.some((r) => appearanceSlot(r.type, r.colour) === slot)
  )
    return false;
  if (equippedChoice(current, category, colour) !== id) {
    const slots = { ...current.slots };
    if (id === "default") delete slots[slot];
    else slots[slot] = skin.id;
    const versionAfter = getNumber(StorageKeys.syncVersion, 0) + 1;
    commitCoinTransaction({
      versionAfter,
      recordHistory: false,
      inventoryAfter: inventory(current.owned, "default", undefined, slots),
      entry: {
        id: `equip:${slot}:${versionAfter}`,
        at: Date.now(),
        amount: 0,
        balance,
        label: "Equipment changed",
      },
    });
    queueSync("progress");
  }
  return true;
}
