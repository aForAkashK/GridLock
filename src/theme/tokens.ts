/**
 * Design tokens — the single source of truth for colour and spacing.
 *
 * Level JSON stores palette KEYS (e.g. "red"), never hex values, so a skin or
 * environment swap never requires touching level data.
 */

export const VehiclePalette = {
  red: { body: '#E8503A', shade: '#C43A26', glass: '#BFE3F5' },
  blue: { body: '#3B82D6', shade: '#2A62A8', glass: '#BFE3F5' },
  yellow: { body: '#F2B233', shade: '#D2941C', glass: '#BFE3F5' },
  green: { body: '#4CAF6D', shade: '#358551', glass: '#BFE3F5' },
  purple: { body: '#8B5CD6', shade: '#6A42A8', glass: '#BFE3F5' },
  orange: { body: '#F2803A', shade: '#CC6224', glass: '#BFE3F5' },
} as const;

export type PaletteKey = keyof typeof VehiclePalette;

export const Colors = {
  boardBackground: '#3E4A56',
  roadTile: '#55636F',
  roadLine: '#F5F0E6',
  exitMarker: '#F2D24B',
  selection: '#FFFFFF',
  hintGlow: '#F2D24B',
  screenBackground: '#2C353F',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8C2CC',
  coin: '#F2C230',
  shadow: 'rgba(0, 0, 0, 0.25)',
} as const;

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const Radius = { sm: 6, md: 12, lg: 20, pill: 999 } as const;

/** PRD section 6 — movement must land in this window to feel physical. */
export const Timing = {
  moveMinMs: 150,
  moveMaxMs: 350,
  /** Per cell travelled, clamped between the two values above. */
  movePerCellMs: 55,
  exitMs: 300,
  bounceMs: 120,
} as const;

/**
 * Home screen palette, sampled from `assets/ui/bg/home.png` and the
 * `UI/Home_UI.png` reference rather than picked by eye.
 *
 * The background art carries the logo, tagline and vehicles, so the screen
 * never draws those itself — the chrome here only has to sit on top of it
 * without fighting it.
 */
export const Home = {
  /** Road grey at the foot of the art. Fills below where the image ends. */
  road: '#5A5462',
  roadDeep: '#4A4553',

  /** Dark navy used by the top-bar chrome in the reference. */
  chrome: '#26324C',
  chromeBorder: '#1A2338',

  coinGold: '#FEE032',

  /** Median of the artwork's top edge, for the strip behind the status bar. */
  sky: '#1F9CFD',

  /** The PLAY button reads as a lit green pill with a darker rim. */
  playTop: '#67E03D',
  playBottom: '#35B938',
  playRim: '#248A32',

  /** Category tiles, in reference order. */
  tileBlue: '#4AA8F0',
  tilePurple: '#8358E0',
  tileAmber: '#F5C02E',
  tilePink: '#E8456B',
  tileHighlight: 'rgba(255, 255, 255, 0.28)',

  badge: '#E32B30',
  banner: '#F7E6D1',
  bannerInk: '#4A4553',
} as const;
