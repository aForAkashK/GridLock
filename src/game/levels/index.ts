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
 * exactly one idea. Levels 7-50 come from `tools/level-tools/generate-levels.ts`,
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
import level021 from './level021.json';
import level022 from './level022.json';
import level023 from './level023.json';
import level024 from './level024.json';
import level025 from './level025.json';
import level026 from './level026.json';
import level027 from './level027.json';
import level028 from './level028.json';
import level029 from './level029.json';
import level030 from './level030.json';
import level031 from './level031.json';
import level032 from './level032.json';
import level033 from './level033.json';
import level034 from './level034.json';
import level035 from './level035.json';
import level036 from './level036.json';
import level037 from './level037.json';
import level038 from './level038.json';
import level039 from './level039.json';
import level040 from './level040.json';
import level041 from './level041.json';
import level042 from './level042.json';
import level043 from './level043.json';
import level044 from './level044.json';
import level045 from './level045.json';
import level046 from './level046.json';
import level047 from './level047.json';
import level048 from './level048.json';
import level049 from './level049.json';
import level050 from './level050.json';

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
  level021 as Level,
  level022 as Level,
  level023 as Level,
  level024 as Level,
  level025 as Level,
  level026 as Level,
  level027 as Level,
  level028 as Level,
  level029 as Level,
  level030 as Level,
  level031 as Level,
  level032 as Level,
  level033 as Level,
  level034 as Level,
  level035 as Level,
  level036 as Level,
  level037 as Level,
  level038 as Level,
  level039 as Level,
  level040 as Level,
  level041 as Level,
  level042 as Level,
  level043 as Level,
  level044 as Level,
  level045 as Level,
  level046 as Level,
  level047 as Level,
  level048 as Level,
  level049 as Level,
  level050 as Level,
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
