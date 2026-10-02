import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { authenticate, saveProgress, loadProgress } from './local-account.js';
import { initialState } from './cafe-game.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data };
};
const toHex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
async function legacyHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256)));
}
test('registration, normalized login, duplicate and wrong password rejection', async () => {
  const storage = memory();
  const user = await authenticate(storage, 'Barista', 'demo-password', true);
  assert.equal(user.id, 'barista');
  assert.ok(!JSON.stringify([...storage.data.values()]).includes('demo-password'));
  assert.equal(JSON.parse(storage.getItem('little-cup:account:v1:barista')).iterations, 600000);
  assert.deepEqual(await authenticate(storage, 'BARISTA', 'demo-password'), user);
  await assert.rejects(authenticate(storage, 'barista', 'wrong-password'));
  await assert.rejects(authenticate(storage, 'barista', 'demo-password', true));
  await assert.rejects(authenticate(storage, 'missing', 'demo-password'));
  await assert.rejects(authenticate(storage, 'x', 'short', true));
});
test('legacy password hashes are upgraded after a successful login', async () => {
  const storage = memory();
  const salt = '00112233445566778899aabbccddeeff';
  storage.setItem('little-cup:account:v1:old', JSON.stringify({ id: 'old', salt, hash: await legacyHash('demo-password', salt) }));
  assert.deepEqual(await authenticate(storage, 'old', 'demo-password'), { id: 'old' });
  const upgraded = JSON.parse(storage.getItem('little-cup:account:v1:old'));
  assert.equal(upgraded.iterations, 600000);
  assert.notEqual(upgraded.salt, salt);
});
test('malformed account records always fail safely', async () => {
  const storage = memory();
  for (const record of ['{', '{}', JSON.stringify({ id: 'bad', salt: 'x', hash: 'y', iterations: 1 })]) {
    storage.setItem('little-cup:account:v1:bad', record);
    await assert.rejects(authenticate(storage, 'bad', 'demo-password'), /아이디 또는 비밀번호/);
  }
});
test('free-form names allow Korean, spaces, symbols, short and long names but reject duplicates and blanks', async () => {
  const storage = memory();
  for (const name of ['가', '우리 카페 ☕!', 'a'.repeat(30)]) {
    const user = await authenticate(storage, name, 'demo-password', true);
    assert.equal(user.id, name);
    assert.deepEqual(await authenticate(storage, name, 'demo-password'), user);
    await assert.rejects(authenticate(storage, ` ${name} `, 'demo-password', true), /이미 사용 중/);
  }
  await assert.rejects(authenticate(storage, '   ', 'demo-password', true), /아이디를 입력/);
  await assert.rejects(authenticate(storage, '', 'demo-password', true), /아이디를 입력/);
});

test('progress is separated by account and restarts the day while retaining purchases and money', () => {
  const storage = memory();
  const state = { ...initialState(4, 30000, ['matcha'], { machine: 2, decor: 1, supplier: 1 }), stage: 'prep', cup: true, parts: ['milk'] };
  saveProgress(storage, 'alice', state);
  const restarted = initialState(4, 30000, ['matcha'], { machine: 2, decor: 1, supplier: 1 });
  assert.deepEqual(loadProgress(storage, 'alice'), restarted);
  assert.equal(loadProgress(storage, 'bob'), undefined);
  saveProgress(storage, 'bob', initialState());
  assert.deepEqual(loadProgress(storage, 'alice'), restarted);
  storage.setItem('little-cup:save:v1:broken', '{}');
  assert.throws(() => loadProgress(storage, 'broken'));
  storage.setItem('little-cup:save:v1:tampered', JSON.stringify({ version: 2, state: { day: 1, wallet: 100, owned: ['matcha'], upgrades: { machine: 99, decor: 0, supplier: 0 } } }));
  assert.throws(() => loadProgress(storage, 'tampered'));
});
test('every day and saved stage resumes at the first customer with a clean cup and ledger', () => {
  const storage = memory();
  for (const day of [1, 2, 7]) {
    for (const stage of ['counter', 'prep', 'brew', 'ready', 'result', 'summary', 'shop']) {
      const saved = { ...initialState(day, 22000), stage, customer: 4, patience: 20, sales: 10000, costs: 2000, parts: ['milk'], cup: true, brew: 60 };
      saveProgress(storage, 'barista', saved);
      assert.deepEqual(loadProgress(storage, 'barista'), initialState(day, 22000));
    }
  }
});

test('storage failures propagate instead of claiming success', async () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } };
  await assert.rejects(authenticate(storage, 'barista', 'demo-password', true));
  assert.throws(() => saveProgress(storage, 'barista', initialState()));
});
