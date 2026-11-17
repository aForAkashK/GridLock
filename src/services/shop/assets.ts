import type { ShopSkin } from "./policy";

/** Shared preview and board sources. */
export const skinAssets: Record<ShopSkin["id"], number> = {
  red_racer: require("../../../assets/game/vehicles/skins/red_racer.webp"),
  blue_racer: require("../../../assets/game/vehicles/skins/blue_racer.webp"),
  green_racer: require("../../../assets/game/vehicles/skins/green_racer.webp"),
  yellow_racer: require("../../../assets/game/vehicles/skins/yellow_racer.webp"),
  blue_hauler: require("../../../assets/game/vehicles/skins/blue_hauler.webp"),
  green_hauler: require("../../../assets/game/vehicles/skins/green_hauler.webp"),
  blue_express: require("../../../assets/game/vehicles/skins/blue_express.webp"),
  yellow_express: require("../../../assets/game/vehicles/skins/yellow_express.webp"),
};
