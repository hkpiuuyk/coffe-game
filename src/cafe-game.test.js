import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reducer, availableRecipes, availableIngredients, brewRange, ingredientCost, ingredients } from './cafe-game.js';

test('brewing advances 4.5 per tick and still allows stopping in the green zone', () => {
  let s = { ...initialState(), stage: 'brew' };
  for (let i = 0; i < 13; i++) s = reducer(s, { type: 'tick' });
  assert.equal(s.brew, 58.5);
  assert.equal(reducer(s, { type: 'stop' }).quality, 100);
  for (let i = 0; i < 10; i++) s = reducer(s, { type: 'tick' });
  assert.equal(s.brew, 100);
  assert.equal(s.stage, 'ready');
});

const shop = wallet => reducer({ ...initialState(1, wallet), stage: 'summary' }, { type: 'shop' });
const buy = (s, id) => reducer(s, { type: 'buy', id });

test('shop follows settlement, blocks in-game purchases and insufficient balances', () => {
  const start = initialState();
  assert.equal(buy(start, 'machine'), start);
  const poor = buy(shop(100), 'machine');
  assert.equal(poor.wallet, 100);
  assert.equal(poor.upgrades.machine, 0);
  assert.ok(poor.shopMessage);
  assert.equal(reducer(poor, { type: 'tick' }), poor);
});

test('unlock charges once, persists overnight and adds achievable orders', () => {
  let s = shop(20000);
  assert.equal(availableRecipes(s).length, 4);
  assert.equal(availableIngredients(s).length, 5);
  s = buy(s, 'vanilla');
  assert.equal(s.wallet, 12000);
  assert.equal(buy(s, 'vanilla'), s);
  s = reducer(s, { type: 'day' });
  assert.equal(s.day, 2);
  assert.equal(s.wallet, 12000);
  assert.ok(s.owned.includes('vanilla'));
  assert.equal(availableRecipes(s).length, 5);
  const orders = [];
  for (let i = 0; i < 5; i++) {
    orders.push(s.order.name);
    assert.ok(s.order.parts.every(id => availableIngredients(s).some(x => x.id === id)));
    s = reducer({ ...s, stage: 'result' }, { type: 'next' });
  }
  assert.ok(orders.includes('바닐라 라떼'));
  assert.equal(s.stage, 'summary');
});

test('upgrades have increasing prices, capped levels, real effects and survive next day', () => {
  let s = shop(100000);
  s = buy(buy(buy(s, 'machine'), 'machine'), 'machine');
  assert.equal(s.wallet, 64000);
  assert.equal(s.upgrades.machine, 3);
  assert.equal(buy(s, 'machine'), s);
  s = buy(buy(s, 'decor'), 'supplier');
  assert.equal(s.wallet, 52000);
  s = reducer(s, { type: 'day' });
  assert.deepEqual(brewRange(s), [40, 95]);
  assert.equal(ingredientCost(s, ingredients[0]), 270);
  const ticked = reducer(s, { type: 'tick' });
  assert.ok(ticked.patience > reducer(initialState(), { type: 'tick' }).patience);
  assert.equal(reducer({ ...s, stage: 'brew', brew: 42 }, { type: 'stop' }).quality, 100);
  const poured = reducer({ ...s, stage: 'prep', cup: true }, { type: 'pour' });
  assert.equal(poured.wallet, s.wallet - 270);
  assert.equal(poured.costs, 270);
});

test('dropping adds the dragged ingredient once and charges its own cost', () => {
  const s = { ...initialState(), stage: 'prep', cup: true, selected: 'coffee' };
  const next = reducer(s, { type: 'pour', id: 'milk' });
  assert.deepEqual(next.parts, ['milk']);
  assert.equal(next.wallet, s.wallet - 250);
  assert.equal(next.costs, 250);
  assert.equal(reducer(s, { type: 'pour', id: 'unknown' }), s);
  assert.equal(reducer(s, { type: 'pour', id: 'matcha' }), s);
  for (const blocked of [{ ...s, cup: false }, { ...s, stage: 'brew' }, { ...s, parts: Array(5).fill('milk') }]) {
    assert.equal(reducer(blocked, { type: 'pour', id: 'milk' }), blocked);
  }
});

test('locked ingredients cannot be selected or poured', () => {
  const s = initialState();
  assert.equal(reducer(s, { type: 'select', id: 'matcha' }), s);
  const forged = { ...s, stage: 'prep', cup: true, selected: 'matcha' };
  assert.equal(reducer(forged, { type: 'pour' }), forged);
});
