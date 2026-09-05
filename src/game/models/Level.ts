/**
 * Level model — pure data. Levels are JSON, loaded at runtime.
 *
 * Adding levels must never require an engine change. Anything a level needs to
 * express belongs in this type, not in a component.
 */

import type { Vehicle } from './Vehicle';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Level = {
  id: number;
  /** Board is always square: gridSize x gridSize cells. */
  gridSize: number;
  difficulty: Difficulty;
  vehicles: Vehicle[];
  /**
   * Known-good solution length, produced by the solver at authoring time.
   * Used to rate the player's move count and to power the hint system.
   */
  parMoves?: number;
  /** Reserved for v0.3+ — cones, barriers, buildings. Empty for MVP. */
  obstacles?: Obstacle[];
};

export type Obstacle = {
  id: string;
  type: 'cone' | 'barrier' | 'roadblock' | 'building';
  x: number;
  y: number;
  width: number;
  height: number;
};
