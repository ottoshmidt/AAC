import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { LANGUAGES } from '../js/i18n.js';
import { clips } from '../js/clips.js';
import { clipFor, itemSets } from '../js/items.js';

const root = new URL('../', import.meta.url);
const serviceWorker = readFileSync(new URL('sw.js', root), 'utf8');

describe('picture sets', () => {
  it('are the seven expected sets of 24 items with unique ids', () => {
    assert.deepEqual(Object.keys(itemSets), ['mixed', 'fruit', 'vegetables', 'transport', 'clothes', 'animals', 'birds']);
    for (const [name, items] of Object.entries(itemSets)) {
      assert.equal(items.length, 24, name);
      assert.equal(new Set(items.map((i) => i.id)).size, items.length, `${name}: duplicate ids`);
    }
  });

  it('have an image file for every item', () => {
    for (const item of Object.values(itemSets).flat()) {
      assert.ok(existsSync(new URL(item.image, root)), `missing ${item.image}`);
    }
  });

  it('have a label in every language', () => {
    for (const [name, items] of Object.entries(itemSets)) {
      for (const item of items) {
        for (const lang of Object.keys(LANGUAGES)) assert.ok(item.label[lang], `${name}/${item.id} has no ${lang} label`);
      }
    }
  });

  it('precache every image and clip for offline use', () => {
    const files = Object.values(itemSets)
      .flat()
      .flatMap((item) => [item.image, ...Object.values(item.audio ?? {})])
      .concat(Object.values(clips).flatMap((byLabel) => Object.values(byLabel)));
    for (const file of files) {
      assert.ok(serviceWorker.includes(`'${file}'`), `${file} is not in PRECACHE in sw.js`);
      assert.ok(existsSync(new URL(file, root)), `missing ${file}`);
    }
  });

  it('find recorded clips by label, with an item’s own audio taking precedence', () => {
    const item = { id: 'x', image: '', label: { xx: 'Hello' }, audio: { yy: 'own.wav' } };
    clips.xx = { Hello: 'assets/audio/xx/x.wav' };
    clips.yy = { undefined: 'wrong.wav' };
    try {
      assert.equal(clipFor(item, 'xx'), 'assets/audio/xx/x.wav');
      assert.equal(clipFor(item, 'yy'), 'own.wav');
      assert.equal(clipFor(item, 'zz'), undefined);
    } finally {
      delete clips.xx;
      delete clips.yy;
    }
  });
});
