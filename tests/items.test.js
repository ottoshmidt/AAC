import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { items } from '../js/items.js';

const root = new URL('../', import.meta.url);
const serviceWorker = readFileSync(new URL('sw.js', root), 'utf8');

describe('item pool', () => {
  it('has 24 items with unique ids', () => {
    assert.equal(items.length, 24);
    assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  });

  it('has an image file for every item', () => {
    for (const item of items) assert.ok(existsSync(new URL(item.image, root)), `missing ${item.image}`);
  });

  it('precaches every image and clip for offline use', () => {
    for (const item of items) {
      for (const file of [item.image, ...Object.values(item.audio ?? {})]) {
        assert.ok(serviceWorker.includes(`'${file}'`), `${file} is not in PRECACHE in sw.js`);
      }
    }
  });
});
