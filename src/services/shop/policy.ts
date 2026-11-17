import { SKIN_PRICES } from "../coins/economy";
export const VEHICLE_CATEGORIES = ["car", "truck", "bus"] as const;
export const SKIN_COLOURS = [
  "red",
  "blue",
  "yellow",
  "green",
  "purple",
  "orange",
] as const;
export type EquipmentCategory = (typeof VEHICLE_CATEGORIES)[number];
export type SkinColour = (typeof SKIN_COLOURS)[number];
export type AppearanceSlot = `${EquipmentCategory}:${SkinColour}`;
function singleSkin<Id extends string>(
  id: Id,
  title: string,
  type: EquipmentCategory,
  colour: SkinColour
) {
  const vehicle =
    type === "car" ? "compact cars" : type === "truck" ? "trucks" : "buses";
  return {
    id,
    title,
    price: SKIN_PRICES[type === "car" ? "standard" : type],
    description: `Replaces ${colour} ${vehicle} only.`,
    replacements: [{ type, colour, sprite: id }] as const,
  };
}
export const SKINS = [
  {
    id: "default",
    title: "Classic Garage",
    price: 0,
    description: "Original mixed-colour vehicles.",
    replacements: [],
  },
  singleSkin("red_racer", "Red Racer", "car", "red"),
  singleSkin("blue_racer", "Blue Racer", "car", "blue"),
  singleSkin("green_racer", "Green Racer", "car", "green"),
  singleSkin("yellow_racer", "Yellow Racer", "car", "yellow"),
  singleSkin("blue_hauler", "Blue Hauler", "truck", "blue"),
  singleSkin("green_hauler", "Green Hauler", "truck", "green"),
  singleSkin("blue_express", "Blue Express", "bus", "blue"),
  singleSkin("yellow_express", "Yellow Express", "bus", "yellow"),
] as const;
export type ShopSkin = Exclude<(typeof SKINS)[number], { id: "default" }>;
export type SkinId = (typeof SKINS)[number]["id"];
export type SkinSlots = Partial<Record<AppearanceSlot, SkinId>>;
export type Inventory = {
  owned: string[];
  selected: SkinId;
  slots?: SkinSlots;
};
export function appearanceSlot(
  category: EquipmentCategory,
  colour: SkinColour
): AppearanceSlot {
  return `${category}:${colour}`;
}
export function ownsChoice(owned: string[], id: string): boolean {
  return id === "default" || owned.includes(id);
}
export function inventory(
  owned: unknown,
  selected: unknown,
  _legacyEquipment?: unknown,
  slots?: unknown
): Inventory {
  const ids = Array.isArray(owned)
    ? owned
        .filter(
          (id): id is string =>
            typeof id === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(id)
        )
        .slice(0, 128)
    : [];
  const all = [
    "default",
    ...new Set(ids.filter((id) => id !== "default")),
  ].sort();
  const requested: Record<string, unknown> =
    slots && typeof slots === "object"
      ? (slots as Record<string, unknown>)
      : selected === "red_racer"
      ? { "car:red": selected }
      : {};
  const result: SkinSlots = {};
  for (const skin of SKINS) {
    if (!all.includes(skin.id)) continue;
    for (const replacement of skin.replacements) {
      const slot = appearanceSlot(replacement.type, replacement.colour);
      if (requested[slot] === skin.id) result[slot] = skin.id;
    }
  }
  return {
    owned: all,
    selected: result["car:red"] ?? "default",
    ...(Object.keys(result).length ? { slots: result } : {}),
  };
}
export function equippedChoice(
  saved: Inventory,
  category: EquipmentCategory,
  colour: SkinColour = "red"
): SkinId {
  return saved.slots?.[appearanceSlot(category, colour)] ?? "default";
}
export function mergeInventory(
  local: Inventory,
  remote: Inventory,
  preferRemote = false
): Inventory {
  const preferred = preferRemote ? remote : local;
  return inventory(
    [...local.owned, ...remote.owned],
    preferred.selected,
    undefined,
    preferred.slots
  );
}
/** Only the exact vehicle type + level palette colour may use a replacement. */
export function replacementSprite(
  type: string,
  colour: string,
  skinId: string
): ShopSkin["id"] | undefined {
  const skin = SKINS.find((s) => s.id === skinId);
  return skin?.replacements.find((r) => r.type === type && r.colour === colour)
    ?.sprite;
}
