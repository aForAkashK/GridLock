import { futureCatalog as feed } from '../../test-support/levelFixtures';
import { LEVELS } from '../../src/game/levels';
import { parseCatalog } from '../../src/services/levels/catalog';
import {
  installCatalog,
  useLevelCatalogStore,
  followingLevelId,
} from '../../src/state/levelCatalogStore';
import { useGameStore } from '../../src/state/gameStore';
jest.mock('../../src/services/audio/audioService', () => ({ play: jest.fn() }));
import { legalMoves } from '../../src/game/engine/movement';

jest.mock('../../src/services/levels/catalogRepository', () => ({
  readCachedCatalog: () => null,
}));

describe('reactive level catalog', () => {
  beforeEach(() => useLevelCatalogStore.setState({ levels: [...LEVELS] }));
  it('updates level selection, counts and the bundled/downloaded next-level boundary', () => {
    expect(
      followingLevelId(useLevelCatalogStore.getState().levels, 100),
    ).toBeUndefined();
    installCatalog(parseCatalog(JSON.stringify(feed), 100, 2));
    const levels = useLevelCatalogStore.getState().levels;
    expect(levels).toHaveLength(101);
    expect(followingLevelId(levels, 100)).toBe(101);
    expect(followingLevelId(levels, 101)).toBeUndefined();
    expect(followingLevelId(levels, 999)).toBeUndefined();
  });
  it('preserves board identities, game state and undo history when content arrives', () => {
    useGameStore.getState().loadLevel(LEVELS[49]);
    useGameStore
      .getState()
      .moveVehicle(legalMoves(useGameStore.getState().state!)[0]);
    const state = useGameStore.getState();
    expect(state.history).toHaveLength(1);
    installCatalog(parseCatalog(JSON.stringify(feed), 100, 2));
    expect(useGameStore.getState()).toBe(state);
    expect(useLevelCatalogStore.getState().levels[49]).toBe(LEVELS[49]);
    const firstDownloaded = useLevelCatalogStore.getState().levels[100];
    installCatalog(parseCatalog(JSON.stringify({ ...feed, revision: 2 }), 100, 2));
    expect(useLevelCatalogStore.getState().levels[100]).toBe(firstDownloaded);
  });
});
