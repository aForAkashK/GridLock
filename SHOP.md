# Garage, inventory and coin history

The first purchasable cosmetic is **Red Racer, 300 earned coins**. Classic Garage stays free. The sports coupe replaces only red compact cars; other colours, trucks, buses and recognisable special vehicles remain unchanged. No rules, footprints or level JSON change.

Shop uses the user-provided cartoon reference and lists sale cosmetics only, showing price or Owned. Inventory shows a separate default for each vehicle type/colour plus purchased cosmetics. Each of the 18 default entries represents its own slot; equipping a red car skin deselects only the default red car. Blue cars and red trucks retain their independent defaults. Hold a default image for an enlarged preview. Purchase confirmation uses a custom blue/cream cartoon modal with actual item art, catalog price, balance, Cancel, Close and Buy controls. Buying does not automatically equip. No network wait or new dependency is added.

## Persistence

- `shop/policy.ts`: catalog, stable IDs, bounded ownership normalization and union merge. Defaults are implicitly owned; paid choices require ownership. Replacements declare their exact type/colour in the catalog. Inventory slots map type:colour to a purchased skin. The legacy selected field mirrors car:red for compatibility; erroneous classic_colour and category-wide overrides are ignored on read without removing purchases. Preserve valid future ownership IDs for older clients.
- `shop/shopService.ts`: check catalog price, balance, existing ownership and account-restore gate synchronously. One durable coin transaction includes resulting coins/version/ownership/selection/history receipt. Repeated taps cannot charge again.
- `coins/transaction.ts`: journal first, then write resulting absolute values, append a deduplicated history receipt, clear journal last. Repair before reads, startup/cloud reconciliation, sync and account recovery. Ordinary coin earnings/spending use this journal too. Equipment changes use the same journal with no history entry and no coin change. Daily/Awards retain their legacy journals and now include a history receipt before clearing the intent.
- Existing player document syncs inventory ownership and selected skin. Union ownership independent of balances. Slot equipment follows the cloud balance winner on launch, and existing cloud equipment during explicit account recovery. Never add balances. This retains the existing client-authoritative multi-device limitations; trusted verification is still required before currency is sold.

## History boundaries

Latest 200 entries, local to this device, insertion ordered. Each shows time, reason, signed coin change and resulting balance. Daily and Awards, level wins, assistance and skin purchases are included. Free restart/zero-value changes do not create spending entries. Old activity cannot be reconstructed. If no activity exists when opening History, show an opening balance. A changed balance restored from cloud creates a zero-change checkpoint, never a pretend earning. History IDs are independent of sync versions, which may decrease during account recovery. History is not uploaded or recovered after uninstall.

## Acceptance

Run TypeScript, lint, Jest and asset audit. Tests exercise purchase duplicate taps, insufficient funds, unknown IDs, unowned equipment, interrupted writes at every step, history deduplication/bounds, reused cloud versions and cloud restore ordering. On emulator/device inspect all tabs, confirmation/cancel, bought/equipped states, and a level containing a red compact car. User's existing coins should not be spent solely for a visual check; unit tests cover purchase/claim writes.


Presentation: one static Skia surface paints all six card gradients, borders and button bevels. Vehicle art, names and actions remain native. The city background is reused; only the 40.5 KiB transparent banner is new. Large text/narrow screens switch the grid to two columns. Future special-vehicle banners are decorative, clearly coming soon and do not accept purchases. See assets/ui/shop/README.md for banner provenance and prompt.


## Colour correction

The previous category-wide colour-selection implementation was incorrect and is removed. The renderer always starts from the vehicle's original level type/colour; only a catalog-declared replacement for that exact slot can override it. Even a stale classic_blue setting cannot turn the fleet blue. Inventory normalization rejects mismatched/unowned slot overrides and migrates legacy Red Racer selection into car:red. Default restores only its selected slot. No engine or JSON changes.
