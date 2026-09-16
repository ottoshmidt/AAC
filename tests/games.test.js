import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { CATEGORIES, games } from '../js/games/index.js';
import { LANGUAGES, t } from '../js/i18n.js';
import { itemSets } from '../js/items.js';

const root = new URL('../', import.meta.url);
const serviceWorker = readFileSync(new URL('sw.js', root), 'utf8');

describe('game registry', () => {
  it('has Training and the seven Guess items games in one category, with unique ids', () => {
    const sets = ['mixed', 'fruit', 'vegetables', 'transport', 'clothes', 'animals', 'birds'];
    const ids = (category) => games.filter((g) => g.category === category).map((g) => g.id);
    assert.deepEqual(ids('guess'), ['train', ...sets.map((s) => `guess-${s}`)], 'Training comes first');
    assert.equal(new Set(games.map((g) => g.id)).size, games.length);
    for (const game of games) assert.ok(CATEGORIES.includes(game.category), `${game.id}: unknown category`);
  });

  it('trains on ten pictures from the Mixed set', () => {
    const train = games.find((g) => g.id === 'train');
    assert.equal(train?.items?.length, 10);
    assert.deepEqual(
      train?.items?.map((i) => i.id),
      itemSets.mixed.slice(0, 10).map((i) => i.id),
    );
  });

  it('every game has an icon file that is precached', () => {
    for (const game of games) {
      assert.ok(existsSync(new URL(game.icon, root)), `missing ${game.icon}`);
      assert.ok(serviceWorker.includes(`'${game.icon}'`), `${game.icon} not in PRECACHE`);
    }
  });

  it('every game and category has its strings in every language', () => {
    for (const lang of Object.keys(LANGUAGES)) {
      for (const category of CATEGORIES) {
        const key = `categories.${category}.name`;
        assert.notEqual(t(lang, key), key, `${lang}: ${key} missing`);
      }
      for (const game of games) {
        const keys = [`games.${game.id}.name`, `games.${game.textId ?? game.id}.help`];
        for (const key of keys) assert.notEqual(t(lang, key), key, `${lang}: ${key} missing`);
      }
    }
  });
});
