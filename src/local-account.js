import { initialState } from './cafe-game.js';

const accountKey = name => `little-cup:account:v1:${name.trim().toLowerCase()}`;
const saveKey = id => `little-cup:save:v1:${id}`;
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(bits));
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
    const hash = await hashPassword(password, salt);
    // Recheck after asynchronous hashing before creating the local account.
    if (storage.getItem(key)) throw new Error('이미 사용 중인 아이디예요.');
    storage.setItem(key, JSON.stringify({ id, salt, hash }));
  } else {
    if (!raw) throw new Error('아이디 또는 비밀번호가 맞지 않아요.');
    const account = JSON.parse(raw);
    if (account.id !== id || await hashPassword(password, account.salt) !== account.hash) throw new Error('아이디 또는 비밀번호가 맞지 않아요.');
  }
  return { id };
}
export function loadProgress(storage, id) {
  const raw = storage.getItem(saveKey(id));
  if (!raw) return undefined;
  const saved = JSON.parse(raw);
  if (saved.version !== 1 || !saved.state || !Number.isInteger(saved.state.day) || saved.state.day < 1 || !Number.isFinite(saved.state.wallet) || !Array.isArray(saved.state.owned) || !saved.state.upgrades || !Array.isArray(saved.state.parts) || !saved.state.order || !Array.isArray(saved.state.order.parts)) throw new Error('저장된 게임을 읽을 수 없어요. 브라우저 저장 데이터를 확인해 주세요.');
  const { day, wallet, owned, upgrades } = saved.state;
  return initialState(day, wallet, owned, upgrades);
}
export function saveProgress(storage, id, state) {
  storage.setItem(saveKey(id), JSON.stringify({ version: 1, state }));
}
