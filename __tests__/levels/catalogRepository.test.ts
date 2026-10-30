import { futureCatalog as feed } from '../../test-support/levelFixtures';
import {
  readCachedCatalog,
  persistCatalog,
} from '../../src/services/levels/catalogRepository';
import { parseCatalog } from '../../src/services/levels/catalog';
import { storage, StorageKeys } from '../../src/services/storage/mmkv';

jest.mock('../../src/services/storage/mmkv', () => ({
  storage: { getString: jest.fn(), set: jest.fn() },
  StorageKeys: { levelCatalog: 'content.levelCatalog.v2' },
}));

describe('offline catalog cache', () => {
  beforeEach(() => jest.clearAllMocks());
  it('restores downloaded levels synchronously without a network call', () => {
    (storage.getString as jest.Mock).mockReturnValue(JSON.stringify(feed));
    expect(readCachedCatalog()?.levels).toHaveLength(1);
    expect(storage.getString).toHaveBeenCalledWith(StorageKeys.levelCatalog);
  });
  it.each([undefined, '{', JSON.stringify({ ...feed, rulesVersion: 99 })])(
    'falls back to bundled levels for absent, damaged or incompatible data',
    (text) => {
      (storage.getString as jest.Mock).mockReturnValue(text);
      expect(readCachedCatalog()).toBeNull();
    },
  );
  it('tolerates a failed cache read and stores each snapshot under one key', () => {
    (storage.getString as jest.Mock).mockImplementationOnce(() => {
      throw new Error('read failed');
    });
    expect(readCachedCatalog()).toBeNull();
    const catalog = parseCatalog(JSON.stringify(feed), 100, 2);
    persistCatalog(catalog);
    expect(storage.set).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenCalledWith(
      StorageKeys.levelCatalog,
      JSON.stringify(catalog),
    );
  });
});
