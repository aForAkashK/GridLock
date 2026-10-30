/** One static surface for the entire six-card grid; controls and text stay native. */
import React, { memo } from "react";
import { StyleSheet } from "react-native";
import {
  Canvas,
  Group,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import { CLASSIC_COLOURS } from "../../services/shop/gallery";
import type { InventoryGridLayout } from "./gridLayout";
type Props = {
  layout: InventoryGridLayout;
  selectedIndexes: number[];
};
export const ShopGridBackdrop = memo(function GridBackdropView({
  layout,
  selectedIndexes,
}: Props) {
  const { width, height, tileWidth, tileHeight } = layout;
  return (
    <Canvas
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { width, height }]}
    >
      {CLASSIC_COLOURS.map((c, i) => {
        const x = layout.frames[i].left,
          y = layout.frames[i].top,
          selected = selectedIndexes.includes(i);
        return (
          <Group key={c.id}>
            <RoundedRect
              x={x}
              y={y + 3}
              width={tileWidth}
              height={tileHeight - 3}
              r={13}
              color="#061a2e"
            />
            <RoundedRect
              x={x + 1}
              y={y + 1}
              width={tileWidth - 2}
              height={tileHeight - 5}
              r={12}
            >
              <LinearGradient
                start={vec(x, y)}
                end={vec(x + tileWidth * 0.7, y + tileHeight)}
                colors={[c.top, c.bottom]}
              />
            </RoundedRect>
            <RoundedRect
              x={x + 1.5}
              y={y + 1.5}
              width={tileWidth - 3}
              height={tileHeight - 6}
              r={12}
              style="stroke"
              strokeWidth={selected ? 3 : 1.5}
              color={selected ? "#ffe850" : c.edge}
            />
            <RoundedRect
              x={x + 5}
              y={y + 5}
              width={tileWidth - 10}
              height={tileHeight - 13}
              r={9}
              style="stroke"
              strokeWidth={1}
              color={selected ? "#fff9b2" : "#ffffff22"}
            />
            <RoundedRect
              x={x + 7}
              y={y + tileHeight - 49}
              width={tileWidth - 14}
              height={41}
              r={10}
              color={selected ? "#05731e" : "#ad720d"}
            />
            <RoundedRect
              x={x + 7}
              y={y + tileHeight - 51}
              width={tileWidth - 14}
              height={40}
              r={10}
            >
              <LinearGradient
                start={vec(x, y + tileHeight - 51)}
                end={vec(x, y + tileHeight - 11)}
                colors={
                  selected ? ["#49e62e", "#08a91c"] : ["#fff15c", "#ffbc07"]
                }
              />
            </RoundedRect>
            <RoundedRect
              x={x + 9}
              y={y + tileHeight - 49}
              width={tileWidth - 18}
              height={35}
              r={8}
              style="stroke"
              strokeWidth={1}
              color={selected ? "#94ff62" : "#fff4af"}
            />
          </Group>
        );
      })}
    </Canvas>
  );
});
