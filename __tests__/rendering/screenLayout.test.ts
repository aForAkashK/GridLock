import {
  gameplayLayout,
  levelSelectLayout,
  ACTIONS_HEIGHT,
} from "../../src/game/rendering/screenLayout";
it.each([
  [320, 568, 24, 24],
  [360, 640, 24, 37],
  [393, 851, 24, 24],
  [430, 932, 48, 34],
  [800, 1280, 24, 24],
])(
  "keeps sign and boards clear of system chrome and actions at %ix%i",
  (width, height, top, bottom) => {
    for (const grid of [6, 7, 8]) {
      const result = gameplayLayout(width, height, { top, bottom }, grid);
      expect(result.sign.top).toBeGreaterThanOrEqual(top + 8 - 0.001);
      expect(result.boardTop).toBeGreaterThanOrEqual(
        result.sign.top + result.sign.height + 12 - 0.001
      );
      expect(result.boardTop + result.boardSize).toBeLessThanOrEqual(
        height - ACTIONS_HEIGHT - 12 + 0.001
      );
      expect(result.boardLeft).toBeGreaterThanOrEqual(0);
      expect(result.boardLeft + result.boardSize).toBeLessThanOrEqual(width);
      expect(result.background.top).toBeLessThanOrEqual(0);
      expect(
        result.background.top + result.background.height
      ).toBeGreaterThanOrEqual(height);
    }
  }
);
it("retains the full-size 8x8 board on a tall phone", () => {
  expect(gameplayLayout(393, 851, { top: 24, bottom: 24 }, 8).boardSize).toBe(
    381
  );
});

it.each([
  [320, 568, 24],
  [360, 640, 24],
  [393, 851, 24],
  [430, 932, 48],
  [800, 1280, 24],
])(
  "keeps the painted Levels title below the toolbar at %ix%i",
  (width, height, top) => {
    const result = levelSelectLayout(width, height, top);
    expect(result.titleTop).toBeGreaterThanOrEqual(
      result.chromeBottom + 12 - 0.001
    );
    expect(result.gridTop).toBeGreaterThanOrEqual(
      result.titleBottom + 24 - 0.001
    );
    expect(result.gridTop + 44).toBeLessThan(height);
    expect(result.background.top).toBeLessThanOrEqual(0);
    expect(
      result.background.top + result.background.height
    ).toBeGreaterThanOrEqual(height);
    expect(result.background.left).toBeLessThanOrEqual(0);
    expect(
      result.background.left + result.background.width
    ).toBeGreaterThanOrEqual(width);
  }
);
