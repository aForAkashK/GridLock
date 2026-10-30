/** Shared positions for native inventory controls and their static Skia cards. */
export function inventoryGridLayout(
  width: number,
  columns: 2 | 3,
  fontScale: number,
  count: number
) {
  const tileWidth = (width - (columns - 1) * 8) / columns;
  const carHeight = tileWidth * 1.32;
  const tileHeight = carHeight + 91 + Math.max(0, fontScale - 1) * 35;
  return {
    width,
    height: Math.ceil(count / columns) * (tileHeight + 10) - 10,
    carHeight,
    tileWidth,
    tileHeight,
    frames: Array.from({ length: count }, (_, i) => ({
      left: (i % columns) * (tileWidth + 8),
      top: Math.floor(i / columns) * (tileHeight + 10),
      width: tileWidth,
      height: tileHeight,
    })),
  };
}
export type InventoryGridLayout = ReturnType<typeof inventoryGridLayout>;
