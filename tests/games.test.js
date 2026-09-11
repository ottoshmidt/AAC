import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { games } from '../js/games/index.js';
import { LANGUAGES, t } from '../js/i18n.js';

const root = new URL('../', import.meta.url);
const serviceWorker = readFileSync(new URL('sw.js', root), 'utf8');

describe('game registry', () => {
  it('has at least the Guess items game, with unique ids', () => {
    assert.ok(games.some((g) => g.id === 'guess'));
    assert.equal(new Set(games.map((g) => g.id)).size, games.length);
  });

  it('every game has an icon file that is precached', () => {
    for (const game of games) {
      assert.ok(existsSync(new URL(game.icon, root)), `missing ${game.icon}`);
      assert.ok(serviceWorker.includes(`'${game.icon}'`), `${game.icon} not in PRECACHE`);
    }
  });

  it('every game has a name, description and help in every language', () => {
    for (const game of games) {
      for (const lang of Object.keys(LANGUAGES)) {
        for (const part of ['name', 'description', 'help']) {
          const key = `games.${game.id}.${part}`;
          assert.notEqual(t(lang, key), key, `${lang}: ${key} missing`);
        }
      }
    }
  });
});
