import { Spacing } from "../../theme/tokens";

/** Painted gameplay anchors and safe viewport placement. Rendering only. */
const BG_W = 853,
  BG_H = 1843;
const SIGN = {
  left: 223 / BG_W,
  right: 629 / BG_W,
  top: 114 / BG_H,
  bottom: 283 / BG_H,
};
const FIELD = { top: 541 / BG_H, bottom: 1281 / BG_H };
export const ACTIONS_HEIGHT = 104;
export const ACTION_SIZE = 70;
export function gameplayLayout(
  width: number,
  height: number,
  insets: { top: number; bottom: number },
  gridSize: number
) {
  const scale = Math.max(width / BG_W, height / BG_H);
  const bgW = BG_W * scale,
    bgH = BG_H * scale,
    bgX = (width - bgW) / 2;
  // Crop decorative road at the bottom before cropping the playable HUD.
  const bgY = Math.max((height - bgH) / 2, insets.top + 8 - SIGN.top * bgH);
  const sign = {
    left: bgX + SIGN.left * bgW,
    top: bgY + SIGN.top * bgH,
    width: (SIGN.right - SIGN.left) * bgW,
    height: (SIGN.bottom - SIGN.top) * bgH,
  };
  const minTop = sign.top + sign.height + 12;
  const actionsHeight = Math.max(
    ACTIONS_HEIGHT,
    ACTION_SIZE + insets.bottom + Spacing.md
  );
  const maxBottom = height - actionsHeight - 12;
  const boardSize = Math.max(
    1,
    Math.min(
      width - (gridSize === 8 ? 12 : 24),
      height - insets.top - insets.bottom - ACTIONS_HEIGHT - 170,
      maxBottom - minTop
    )
  );
  const fieldCenter = bgY + ((FIELD.top + FIELD.bottom) / 2) * bgH;
  const boardTop = Math.max(
    minTop,
    Math.min(fieldCenter - boardSize / 2, maxBottom - boardSize)
  );
  return {
    background: { width: bgW, height: bgH, left: bgX, top: bgY },
    sign,
    boardSize,
    boardLeft: (width - boardSize) / 2,
    boardTop,
    actionsHeight,
  };
}

/** Keep the painted Levels title below the Back/coins row on short phones. */
export function levelSelectLayout(
  width: number,
  height: number,
  insetTop: number
) {
  const sourceWidth = 844,
    sourceHeight = 1863;
  const titleTop = 174,
    titleBottom = 312;
  const chromeBottom = insetTop + 12 + 48;
  const minTitleTop = chromeBottom + 12;
  const scale = Math.max(
    width / sourceWidth,
    height / sourceHeight,
    minTitleTop / titleTop
  );
  const bgWidth = sourceWidth * scale,
    bgHeight = sourceHeight * scale;
  const top = Math.max((height - bgHeight) / 2, minTitleTop - titleTop * scale);
  return {
    background: {
      width: bgWidth,
      height: bgHeight,
      left: (width - bgWidth) / 2,
      top,
    },
    titleTop: top + titleTop * scale,
    titleBottom: top + titleBottom * scale,
    chromeBottom,
    gridTop: top + titleBottom * scale + 24,
  };
}
