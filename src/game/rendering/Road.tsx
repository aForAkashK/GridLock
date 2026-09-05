/**
 * The board surface — background, cell grid and border.
 *
 * Deliberately desaturated. Vehicles are the only saturated thing on screen so
 * the eye goes straight to what can actually be interacted with (DESIGN.md).
 */

import React from 'react';
import { Group, RoundedRect, Line, vec } from '@shopify/react-native-skia';
import { Colors } from '../../theme/tokens';
import type { BoardLayout } from './geometry';

type Props = { layout: BoardLayout };

export function Road({ layout }: Props) {
  const { pad, cellSize, gridSize, size } = layout;
  const inner = size - pad * 2;
  const radius = Math.round(cellSize * 0.22);

  // Interior separators only — the outer edges are drawn by the border.
  const lines = [];
  for (let i = 1; i < gridSize; i++) {
    const offset = pad + i * cellSize;
    lines.push(
      <Line
        key={`v${i}`}
        p1={vec(offset, pad)}
        p2={vec(offset, pad + inner)}
        color={Colors.roadLine}
        strokeWidth={1}
        opacity={0.08}
      />,
      <Line
        key={`h${i}`}
        p1={vec(pad, offset)}
        p2={vec(pad + inner, offset)}
        color={Colors.roadLine}
        strokeWidth={1}
        opacity={0.08}
      />,
    );
  }

  return (
    <Group>
      <RoundedRect
        x={pad}
        y={pad}
        width={inner}
        height={inner}
        r={radius}
        color={Colors.roadTile}
      />
      {lines}
      <RoundedRect
        x={pad}
        y={pad}
        width={inner}
        height={inner}
        r={radius}
        color={Colors.boardBackground}
        style="stroke"
        strokeWidth={Math.max(2, cellSize * 0.06)}
      />
    </Group>
  );
}
