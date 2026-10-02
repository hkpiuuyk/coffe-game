import { initialState } from './cafe-game.js';

const accountKey = name => `little-cup:account:v1:${name.trim().toLowerCase()}`;
const saveKey = id => `little-cup:save:v1:${id}`;
const CURRENT_ITERATIONS = 600000;
const LEGACY_ITERATIONS = 210000;
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(bits));
}
function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
function readAccount(raw, id) {
  try {
    const account = JSON.parse(raw);
    const iterations = account.iterations ?? LEGACY_ITERATIONS;
    if (account.id !== id || !/^[a-f0-9]{32}$/.test(account.salt) || !/^[a-f0-9]{64}$/.test(account.hash) || ![LEGACY_ITERATIONS, CURRENT_ITERATIONS].includes(iterations)) throw new Error();
    return { ...account, iterations };
  } catch {
    throw new Error('아이디 또는 비밀번호가 맞지 않아요.');
  }
}
export async function authenticate(storage, name, password, register = false) {
  const id = name.trim().toLowerCase();
  if (!id) throw new Error('아이디를 입력해 주세요.');
  if (password.length < 8 || password.length > 128) throw new Error('비밀번호는 8~128자로 입력해 주세요.');
  const key = accountKey(id);
  const raw = storage.getItem(key);
  if (register) {
    if (raw) throw new Error('이미 사용 중인 아이디예요. 로그인을 선택해 주세요.');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashPassword(password, salt, CURRENT_ITERATIONS);
    // Recheck after asynchronous hashing before creating the local account.
    if (storage.getItem(key)) throw new Error('이미 사용 중인 아이디예요.');
    storage.setItem(key, JSON.stringify({ id, salt, hash, iterations: CURRENT_ITERATIONS }));
  } else {
    if (!raw) throw new Error('아이디 또는 비밀번호가 맞지 않아요.');
    const account = readAccount(raw, id);
    const candidate = await hashPassword(password, account.salt, account.iterations);
    if (!safeEqual(candidate, account.hash)) throw new Error('아이디 또는 비밀번호가 맞지 않아요.');
    if (account.iterations === LEGACY_ITERATIONS) {
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await hashPassword(password, salt, CURRENT_ITERATIONS);
      storage.setItem(key, JSON.stringify({ id, salt, hash, iterations: CURRENT_ITERATIONS }));
    }
  }
  return { id };
}
export function loadProgress(storage, id) {
  const raw = storage.getItem(saveKey(id));
  if (!raw) return undefined;
  try {
    const saved = JSON.parse(raw);
    const state = saved.state;
    if (![1, 2].includes(saved.version) || !state || !Number.isSafeInteger(state.day) || state.day < 1 || !Number.isSafeInteger(state.wallet) || !Array.isArray(state.owned) || !state.upgrades) throw new Error();
    const allowedMaterials = new Set(['vanilla', 'cocoa', 'matcha']);
    const owned = [...new Set(state.owned)].filter(item => typeof item === 'string' && allowedMaterials.has(item));
    const upgrades = Object.fromEntries(['machine', 'decor', 'supplier'].map(key => {
      const value = state.upgrades[key];
      if (!Number.isInteger(value) || value < 0 || value > 3) throw new Error();
      return [key, value];
    }));
    return initialState(state.day, state.wallet, owned, upgrades);
  } catch {
    throw new Error('저장된 게임을 읽을 수 없어요. 브라우저 저장 데이터를 확인해 주세요.');
  }
}
export function saveProgress(storage, id, state) {
  const durableState = { day: state.day, wallet: state.wallet, owned: state.owned, upgrades: state.upgrades };
  storage.setItem(saveKey(id), JSON.stringify({ version: 2, state: durableState }));
}
