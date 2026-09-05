/**
 * Level registry.
 *
 * Levels are static JSON so Metro can inline them into the bundle — no file
 * system read and no network on the level-load path. PRD section 5: adding a
 * level must never require an engine change, only an entry here.
 *
 * Every level here has passed `npm run validate:levels` — solvable, correctly
 * geometried, and with `parMoves` computed by the solver rather than by hand.
 *
 * Levels 1-6 are hand-authored as a teaching sequence, each introducing
 * exactly one idea. Levels 7-20 come from `tools/level-tools/generate-levels.ts`,
 * which generates candidates at random and keeps only those the solver proves
 * hit a target par and start with enough vehicles blocked to be a real puzzle.
 */

import type { Level } from '../models/Level';
import level001 from './level001.json';
import level002 from './level002.json';
import level003 from './level003.json';
import level004 from './level004.json';
import level005 from './level005.json';
import level006 from './level006.json';
import level007 from './level007.json';
import level008 from './level008.json';
import level009 from './level009.json';
import level010 from './level010.json';
import level011 from './level011.json';
import level012 from './level012.json';
import level013 from './level013.json';
import level014 from './level014.json';
import level015 from './level015.json';
import level016 from './level016.json';
import level017 from './level017.json';
import level018 from './level018.json';
import level019 from './level019.json';
import level020 from './level020.json';

export const LEVELS: Level[] = [
  level001 as Level,
  level002 as Level,
  level003 as Level,
  level004 as Level,
  level005 as Level,
  level006 as Level,
  level007 as Level,
  level008 as Level,
  level009 as Level,
  level010 as Level,
  level011 as Level,
  level012 as Level,
  level013 as Level,
  level014 as Level,
  level015 as Level,
  level016 as Level,
  level017 as Level,
  level018 as Level,
  level019 as Level,
  level020 as Level,
];

/** The level after `id`, or undefined when the player has finished them all. */
export function nextLevelId(id: number): number | undefined {
  const index = LEVELS.findIndex(l => l.id === id);
  return index >= 0 ? LEVELS[index + 1]?.id : undefined;
}

export function getLevel(id: number): Level | undefined {
  return LEVELS.find(l => l.id === id);
}

export const TOTAL_LEVELS = LEVELS.length;
