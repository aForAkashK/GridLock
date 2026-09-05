/**
 * Sound effects. Latency is the whole requirement here — a swipe sound that
 * lands 100ms after the swipe feels broken, so clips are preloaded at startup
 * and never decoded on demand.
 */

export type Sfx = 'move' | 'blocked' | 'exit' | 'win' | 'coin' | 'tap';

export function preloadAll(): Promise<void> {
  // TODO(audio): decode every clip once at startup
  throw new Error('Not implemented');
}

export function play(_sfx: Sfx): void {
  // TODO(audio): fire-and-forget, respects settingsStore.soundEnabled
}
