import { DailyColours as Ink } from "../../theme/daily";
/** One static Skia surface paints all bevels; native text/controls remain live. */
import React from "react";
import { StyleSheet } from "react-native";
import {
  Canvas,
  Group,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
export type RewardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type RewardGeometry = Record<string, RewardRect>;
type Props = {
  geometry: RewardGeometry;
  currentDay: number;
  claimed: boolean;
  available: boolean;
};
function Face({
  rect: r,
  colours,
  radius = 16,
  selected = false,
}: {
  rect: RewardRect;
  colours: string[];
  radius?: number;
  selected?: boolean;
}) {
  return (
    <Group>
      {selected ? (
        <RoundedRect
          x={r.x - 2}
          y={r.y - 2}
          width={r.width + 4}
          height={r.height + 4}
          r={radius + 2}
          color={Ink.selectedEdge}
        />
      ) : null}
      <RoundedRect
        x={r.x}
        y={r.y + 4}
        width={r.width}
        height={r.height - 4}
        r={radius}
        color={Ink.tileDepth}
      />
      <RoundedRect
        x={r.x + 1}
        y={r.y + 1}
        width={r.width - 2}
        height={r.height - 7}
        r={radius - 1}
      >
        <LinearGradient
          start={vec(r.x, r.y)}
          end={vec(r.x + r.width * 0.25, r.y + r.height)}
          colors={colours}
        />
      </RoundedRect>
      <RoundedRect
        x={r.x + 3}
        y={r.y + 3}
        width={r.width - 6}
        height={r.height - 11}
        r={radius - 3}
        style="stroke"
        strokeWidth={selected ? 2 : 1}
        color={selected ? Ink.selectedShine : Ink.tileShine}
        opacity={selected ? 1 : 0.45}
      />
      <RoundedRect
        x={r.x + 6}
        y={r.y + 4}
        width={r.width - 12}
        height={4}
        r={2}
        color={Ink.white}
        opacity={0.22}
      />
    </Group>
  );
}
export function GlossyRewardBoard({
  geometry: g,
  currentDay,
  claimed,
  available,
}: Props) {
  const panel = g.panel;
  if (!panel) return null;
  const width = panel.width,
    height = panel.height;
  return (
    <Canvas
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { width, height }]}
    >
      <RoundedRect
        x={0}
        y={5}
        width={width}
        height={height - 5}
        r={28}
        color={Ink.panelDepth}
      />
      <RoundedRect x={1} y={1} width={width - 2} height={height - 8} r={27}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={[Ink.panelRimLight, Ink.panelRim, Ink.panelRimDark]}
        />
      </RoundedRect>
      <RoundedRect x={7} y={8} width={width - 14} height={height - 24} r={22}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={[Ink.panelTop, Ink.panelMiddle, Ink.panelBottom]}
        />
      </RoundedRect>
      <RoundedRect
        x={3}
        y={3}
        width={width - 6}
        height={height - 12}
        r={25}
        style="stroke"
        strokeWidth={1.5}
        color={Ink.panelShine}
        opacity={0.75}
      />
      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
        const tile = g[`tile${day}`],
          row = g[day <= 4 ? "row1" : "row2"],
          days = g.days;
        if (!tile || !row || !days) return null;
        const rect = {
          ...tile,
          x: days.x + row.x + tile.x,
          y: days.y + row.y + tile.y,
        };
        const collected = day < currentDay || (day === currentDay && claimed);
        return (
          <Face
            key={day}
            rect={rect}
            colours={
              collected
                ? [Ink.collectedTop, Ink.collectedMiddle, Ink.collectedBottom]
                : [Ink.tileTop, Ink.tileMiddle, Ink.tileBottom]
            }
            selected={day === currentDay}
          />
        );
      })}
      {g.button ? (
        <Face
          rect={g.button}
          radius={19}
          colours={
            available
              ? [Ink.claimTop, Ink.claimMiddle, Ink.claimBottom]
              : [Ink.claimedTop, Ink.claimedMiddle, Ink.claimedBottom]
          }
        />
      ) : null}
    </Canvas>
  );
}
