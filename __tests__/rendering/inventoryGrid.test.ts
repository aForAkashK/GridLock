import { inventoryGridLayout } from "../../src/components/shop/gridLayout";
it.each([316, 315.999999, 333.454545, 367.428571, 572])(
  "keeps all six cards in their shared positions at grid width %s",
  (width) => {
    for (const columns of [2, 3] as const) {
      const layout = inventoryGridLayout(width, columns, 0.9, 6);
      expect(layout.frames).toHaveLength(6);
      for (const [i, rect] of layout.frames.entries()) {
        expect(rect.top).toBe(Math.floor(i / columns) * (rect.height + 10));
        expect(rect.left + rect.width).toBeLessThanOrEqual(width + 1e-7);
        expect(rect.top + rect.height).toBeLessThanOrEqual(
          layout.height + 1e-7
        );
      }
      expect(layout.frames[columns - 1].top).toBe(0);
      expect(layout.frames[columns].top).toBe(layout.tileHeight + 10);
    }
  }
);
it("grows card and painted-grid height together with enlarged text", () => {
  const normal = inventoryGridLayout(316, 2, 1, 6);
  const large = inventoryGridLayout(316, 2, 1.5, 6);
  expect(large.tileHeight).toBeGreaterThan(normal.tileHeight);
  expect(large.frames[5].top + large.frames[5].height).toBe(large.height);
});
