const mockValues = new Map<string, unknown>();
let mockUser = { uid: 'local-user', isAnonymous: true, hasRecoverableIdentity: false, providers: ['anonymous'] };
const mockCloud = jest.fn(); const mockHydrate = jest.fn(); const mockQueue = jest.fn(); const mockFlush = jest.fn();
const mockLink = jest.fn(); const mockSignIn = jest.fn();
jest.mock('../../src/services/auth/authService', () => ({
  getCurrentUser: () => mockUser, linkAccount: mockLink, signInExistingGoogleSave: mockSignIn,
  ExistingGoogleSaveError: class extends Error {}, AccountLinkCancelledError: class extends Error {},
}));
jest.mock('../../src/state/accountStore', () => ({ useAccountStore: { setState: jest.fn() } }));
jest.mock('../../src/state/playerStore', () => ({ usePlayerStore: { getState: () => ({ hydrateFromStorage: mockHydrate }) } }));
jest.mock('../../src/services/sync/mergeOnLaunch', () => ({ fetchCloudPlayerState: mockCloud }));
jest.mock('../../src/services/sync/syncQueue', () => ({ flush: mockFlush, queueSync: mockQueue, startSyncQueue: jest.fn() }));
jest.mock('../../src/services/storage/mmkv', () => ({
  StorageKeys: { skinSlots: "slots", fleetEquipment: "fleetEquipment", monetization: "monetization", coinHistory: "history", coinTransaction: "transaction", unlockedSkins: "skins", selectedSkin: "selected", coins: 'coins', syncVersion: 'version', currentLevel: 'current', completedLevels: 'completed', pendingAccountRestore: 'pending' },
  storage: {
    getString: (key: string) => mockValues.get(key), getNumber: (key: string) => mockValues.get(key),
    set: (key: string, value: unknown) => mockValues.set(key, value), remove: (key: string) => mockValues.delete(key),
  },
  getNumber: (key: string, fallback: number) => mockValues.get(key) ?? fallback,
  getJSON: (key: string, fallback: unknown) => mockValues.get(key) ?? fallback,
  setJSON: (key: string, value: unknown) => mockValues.set(key, value),
}));

function service() { return require('../../src/services/auth/accountRecovery') as typeof import('../../src/services/auth/accountRecovery'); }
const cloud = { coins: 80, syncVersion: 2, completedLevels: [1, 2, 4], currentLevel: 5 };
describe('account recovery transaction', () => {
  beforeEach(() => {
    jest.resetModules(); jest.clearAllMocks(); mockValues.clear();
    mockUser = { uid: 'local-user', isAnonymous: true, hasRecoverableIdentity: false, providers: ['anonymous'] };
    mockValues.set('coins', 500); mockValues.set('version', 99); mockValues.set('completed', [1, 2, 3]); mockValues.set('current', 4);
    mockCloud.mockReset().mockResolvedValue(cloud);
    mockSignIn.mockReset().mockImplementation(async () => {
      mockUser = { uid: 'google-user', isAnonymous: false, hasRecoverableIdentity: true, providers: ['google'] }; return mockUser;
    });
    mockFlush.mockImplementation(() => { expect(mockValues.has('pending')).toBe(false); });
  });
  afterEach(() => jest.useRealTimers());
  it('restores an existing balance before resuming any queued upload', async () => {
    await service().restoreExistingGoogleSave();
    expect(mockValues.get('coins')).toBe(80); expect(mockValues.get('version')).toBe(2);
    expect(mockValues.get('completed')).toEqual([1, 2, 3, 4]); expect(mockValues.get('current')).toBe(5);
    expect(mockValues.has('pending')).toBe(false); expect(mockHydrate).toHaveBeenCalledTimes(1);
    expect(mockCloud).toHaveBeenCalledWith('google-user', true);
    expect(mockQueue).toHaveBeenCalledWith('progress'); expect(mockFlush).toHaveBeenCalledTimes(1);
  });
  it('retains the recovery marker and local save if the server read fails', async () => {
    mockCloud.mockRejectedValueOnce(new Error('offline'));
    await expect(service().restoreExistingGoogleSave()).rejects.toThrow('offline');
    expect(mockValues.get('pending')).toBe('google-user'); expect(mockValues.get('coins')).toBe(500);
    expect(mockFlush).not.toHaveBeenCalled(); expect(mockHydrate).not.toHaveBeenCalled();
    await service().finishPendingRecovery();
    expect(mockValues.get('coins')).toBe(80); expect(mockValues.has('pending')).toBe(false);
  });
  it('keeps the old save if authentication fails before switching identity', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('cancelled'));
    await expect(service().restoreExistingGoogleSave()).rejects.toThrow('cancelled');
    expect(mockValues.get('coins')).toBe(500); expect(mockValues.has('pending')).toBe(false);
    expect(mockCloud).not.toHaveBeenCalled();
  });
  it('recovers an interrupted pre-switch transaction without locking an anonymous player', async () => {
    mockValues.set('pending', 'switching'); await service().finishPendingRecovery();
    expect(mockValues.has('pending')).toBe(false); expect(mockValues.get('coins')).toBe(500);
    expect(mockCloud).not.toHaveBeenCalled();
  });
  it('bounds a hung cloud restore and keeps uploads paused for retry', async () => {
    jest.useFakeTimers(); mockUser = { uid: 'google-user', isAnonymous: false, hasRecoverableIdentity: true, providers: ['google'] };
    mockValues.set('pending', 'google-user'); mockCloud.mockImplementationOnce(() => new Promise(() => {}));
    const pending = service().finishPendingRecovery(); jest.advanceTimersByTime(8000);
    await expect(pending).rejects.toThrow('timed out');
    expect(mockValues.get('pending')).toBe('google-user'); expect(mockFlush).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
