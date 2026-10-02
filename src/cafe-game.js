import { cEngine } from './c-engine.js';

export const ingredients = [
  { id: 'coffee', name: '에스프레소', color: '#76412b', cost: 300, icon: '☕' },
  { id: 'water', name: '물', color: '#acd5db', cost: 50, icon: '💧' },
  { id: 'milk', name: '우유', color: '#fff0cb', cost: 250, icon: '🥛' },
  { id: 'tea', name: '복숭아 티', color: '#d79140', cost: 200, icon: '🍑' },
  { id: 'ice', name: '얼음', color: '#d5edec', cost: 100, icon: '🧊' },
  { id: 'vanilla', name: '바닐라 시럽', color: '#e5c282', cost: 300, icon: '🍯', unlock: true },
  { id: 'cocoa', name: '초콜릿', color: '#593629', cost: 350, icon: '🍫', unlock: true },
  { id: 'matcha', name: '말차', color: '#92aa65', cost: 400, icon: '🍵', unlock: true },
];
export const recipes = [
  { name: '아메리카노', parts: ['coffee', 'water', 'water'], price: 3200, line: '잠이 확 깨는 커피요. 우유는 빼고 물로만 부탁해요.' },
  { name: '카페라떼', parts: ['coffee', 'milk', 'milk'], price: 4100, line: '커피에 우유가 넉넉히 들어간 부드러운 한 잔이 필요해요.' },
  { name: '아이스티', parts: ['tea', 'tea', 'ice'], price: 3500, line: '커피 말고 달콤한 복숭아 차요! 얼음도 넣어 주세요.' },
  { name: '아이스 라떼', parts: ['coffee', 'milk', 'ice'], price: 4500, line: '커피랑 우유, 그리고 얼음! 시원한 라떼 한 잔 주세요.' },
  { name: '바닐라 라떼', parts: ['coffee', 'milk', 'vanilla'], price: 5500, line: '바닐라 향이 나는 달콤한 라떼 부탁해요.', unlock: 'vanilla' },
  { name: '카페모카', parts: ['coffee', 'milk', 'cocoa'], price: 5800, line: '커피에 우유랑 초콜릿을 넣어 주세요!', unlock: 'cocoa' },
  { name: '말차 라떼', parts: ['matcha', 'milk', 'milk'], price: 6000, line: '커피 없이 말차에 우유를 넉넉히 넣어 주세요.', unlock: 'matcha' },
];
export const shopItems = [
  { id: 'machine', name: '정밀 머신', icon: '⚙️', price: 6000, max: 3, desc: '레벨마다 제조 성공 구간이 양쪽으로 5%씩 넓어져요.' },
  { id: 'decor', name: '포근한 인테리어', icon: '🪴', price: 5000, max: 3, desc: '레벨마다 손님 인내심 감소 속도가 15% 느려져요.' },
  { id: 'supplier', name: '단골 도매 계약', icon: '📦', price: 7000, max: 3, desc: '레벨마다 음료 재료비 10% 할인. 컵은 제외돼요.' },
  ...ingredients.filter(i => i.unlock).map((i, n) => ({ id: i.id, name: i.name, icon: i.icon, price: 8000 + n * 2000, max: 1, material: true, desc: `${recipes.find(r => r.unlock === i.id).name} 메뉴 해금. 사용 시 분량별 재료비가 들어요.` })),
];
export const availableRecipes = s => recipes.filter(r => !r.unlock || s.owned.includes(r.unlock));
export const availableIngredients = s => ingredients.filter(i => !i.unlock || s.owned.includes(i.id));
export const levelOf = (s, item) => item.material ? Number(s.owned.includes(item.id)) : s.upgrades[item.id];
export const priceOf = (s, item) => item.price * (levelOf(s, item) + 1);
export const brewRange = s => [cEngine().brew_min(s.upgrades.machine), cEngine().brew_max(s.upgrades.machine)];
export const ingredientCost = (s, item) => cEngine().ingredient_cost(item.cost, s.upgrades.supplier);
export function initialState(day = 1, wallet = 15000, owned = [], upgrades = { machine: 0, decor: 0, supplier: 0 }) {
  const pool = availableRecipes({ owned });
  return { day, wallet, owned, upgrades, shopMessage: '', purchases: 0, customer: 0, stage: 'counter', order: pool[(day - 1) % pool.length], patience: 100, clarified: false, cup: false, parts: [], selected: 'coffee', brew: 0, quality: 0, sales: 0, costs: 0, tips: 0, refunds: 0, happy: 0, result: null };
}
const active = s => ['counter', 'prep', 'brew', 'ready'].includes(s.stage);
function finish(s, timeout = false) {
  const expected = s.order.parts;
  const correct = expected.length === s.parts.length && [...expected].sort().every((id, i) => id === [...s.parts].sort()[i]);
  const success = !timeout && correct && s.quality >= 70;
  const refund = success || timeout ? 0 : Math.round(s.order.price * .5);
  const sales = timeout ? 0 : s.order.price;
  const tip = success ? Math.round(s.order.price * .2 * s.patience / 100) : 0;
  return { ...s, stage: 'result', sales: s.sales + sales, refunds: s.refunds + refund, tips: s.tips + tip, wallet: s.wallet + sales + tip - refund, happy: s.happy + Number(success), result: { success, sales, refund, tip, text: timeout ? '기다리다 늦겠어요. 다음에 올게요.' : !correct ? '제가 부탁한 재료와 양이 아니네요… 절반은 환불해 주세요.' : s.quality < 70 ? '재료는 맞지만 제대로 만들어지지 않았네요. 절반 환불 부탁해요.' : '딱 제가 원하던 맛이에요! 내일도 들를게요.' } };
}
export function reducer(s, a) {
  switch (a.type) {
    case 'tick': {
      if (!active(s)) return s;
      const next = { ...s, patience: cEngine().patience_step(s.patience, s.upgrades.decor), brew: s.stage === 'brew' ? cEngine().brew_step(s.brew) : s.brew };
      if (next.patience === 0) return finish(next, true);
      if (next.stage === 'brew' && next.brew === 100) return { ...next, stage: 'ready', quality: 35 };
      return next;
    }
    case 'clarify': return s.stage === 'counter' ? { ...s, clarified: true, patience: Math.max(1, s.patience - (s.clarified ? 0 : 3)) } : s;
    case 'accept': return s.stage === 'counter' ? { ...s, stage: 'prep' } : s;
    case 'select': return availableIngredients(s).some(i => i.id === a.id) ? { ...s, selected: a.id } : s;
    case 'cup': return s.stage === 'prep' && !s.cup ? { ...s, cup: true, costs: s.costs + 100, wallet: s.wallet - 100 } : s;
    case 'pour': {
      if (s.stage !== 'prep' || !s.cup || s.parts.length >= 5) return s;
      const item = availableIngredients(s).find(i => i.id === (a.id ?? s.selected));
      if (!item) return s;
      const cost = ingredientCost(s, item);
      return { ...s, parts: [...s.parts, item.id], costs: s.costs + cost, wallet: s.wallet - cost };
    }
    case 'discard': return s.stage === 'prep' ? { ...s, parts: [], cup: false } : s;
    case 'brew': return s.stage === 'prep' && s.cup && s.parts.length ? { ...s, stage: 'brew', brew: 0 } : s;
    case 'stop': return s.stage === 'brew' ? { ...s, stage: 'ready', quality: cEngine().brew_quality(s.brew, s.upgrades.machine) } : s;
    case 'serve': return s.stage === 'ready' ? finish(s) : s;
    case 'next': {
      if (s.stage !== 'result') return s;
      if (s.customer === 4) return { ...s, stage: 'summary', wallet: s.wallet - 1500 };
      const pool = availableRecipes(s);
      return { ...s, customer: s.customer + 1, order: pool[(s.day - 1 + s.customer + 1) % pool.length], stage: 'counter', patience: 100, clarified: false, cup: false, parts: [], brew: 0, result: null };
    }
    case 'shop': return s.stage === 'summary' ? { ...s, stage: 'shop' } : s;
    case 'buy': {
      if (s.stage !== 'shop') return s;
      const item = shopItems.find(i => i.id === a.id);
      if (!item || levelOf(s, item) >= item.max) return s;
      const price = priceOf(s, item);
      if (s.wallet < price) return { ...s, shopMessage: '보유 금액이 부족해요. 다음 영업에서 조금 더 모아 주세요.' };
      return { ...s, wallet: s.wallet - price, purchases: s.purchases + price, owned: item.material ? [...s.owned, item.id] : s.owned, upgrades: item.material ? s.upgrades : { ...s.upgrades, [item.id]: s.upgrades[item.id] + 1 }, shopMessage: `${item.name} 구매 완료! 다음 영업에 적용돼요.` };
    }
    case 'day': return s.stage === 'shop' ? initialState(s.day + 1, s.wallet, s.owned, s.upgrades) : s;
    default: return s;
  }
}
