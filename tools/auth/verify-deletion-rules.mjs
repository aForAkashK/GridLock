// Isolated Firebase emulators only. Never accept production endpoints/projects.
import assert from 'node:assert/strict';
const project = 'demo-gridlock-deletion';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(authHost ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
assert.match(firestoreHost ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
const root = `projects/${project}/databases/(default)/documents`;
const base = `http://${firestoreHost}/v1/${root}`;
async function account() {
  const result = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
  assert.equal(result.status, 200); return result.json();
}
const owner = await account(), other = await account();
const player = (uid) => `${root}/players/${uid}`;
const marker = (uid) => `${root}/deletedPlayers/${uid}`;
const save = (uid) => ({ update: { name: player(uid), fields: { coins: { integerValue: '100' }, syncVersion: { integerValue: '1' }, currentLevel: { integerValue: '1' } } } });
const tombstone = (uid) => ({ update: { name: marker(uid), fields: {} }, updateTransforms: [{ fieldPath: 'deletedAt', setToServerValue: 'REQUEST_TIME' }] });
async function commit(token, writes, expected = 200) {
  const result = await fetch(`${base}:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  assert.equal(result.status, expected, await result.text());
}
await commit(owner.idToken, [save(owner.localId)]);
await commit(other.idToken, [save(owner.localId)], 403);
await commit(owner.idToken, [{ delete: player(owner.localId) }], 403);
await commit(other.idToken, [tombstone(owner.localId), { delete: player(owner.localId) }], 403);
await commit(owner.idToken, [{ update: { name: marker(owner.localId), fields: { deletedAt: { stringValue: 'invalid' } } } }], 403);
await commit(owner.idToken, [tombstone(owner.localId), { delete: player(owner.localId) }]);
// Existing/stale tokens can no longer read/recreate the deleted player.
await commit(owner.idToken, [save(owner.localId)], 403);
const read = await fetch(`${base}/players/${owner.localId}`, { headers: { Authorization: `Bearer ${owner.idToken}` } });
assert.equal(read.status, 403);
await commit(owner.idToken, [tombstone(owner.localId)], 403);
await commit(owner.idToken, [{ delete: marker(owner.localId) }], 403);
// Retrying a committed cloud deletion is safe.
await commit(owner.idToken, [{ delete: player(owner.localId) }]);
// Other accounts still sync normally.
await commit(other.idToken, [save(other.localId)]);
const deleted = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:delete?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: owner.idToken }) });
assert.equal(deleted.status, 200, await deleted.text());
await commit(owner.idToken, [save(owner.localId)], 403);
console.log('Deletion rules: owner-only atomic cleanup, immutable marker, retry, stale-token rejection and Auth removal PASS (emulators only).');
