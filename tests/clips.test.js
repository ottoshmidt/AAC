import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildRegistry, renderClipsModule, updateServiceWorker, wordsFor } from '../scripts/clips-registry.mjs';
import { itemSets } from '../js/items.js';
import { letterSets } from '../js/letters.js';

const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

describe('clip registry', () => {
  it('lists one word per distinct label, named after the first item with it', () => {
    const words = wordsFor('ka');
    const labels = words.map((w) => w.label);
    const pictures = Object.values(itemSets).flat().length;
    assert.equal(new Set(labels).size, labels.length);
    assert.ok(words.length < pictures + letterSets.ka.length, 'shared words are recorded once');
    const apple = words.find((w) => w.label === 'ვაშლი');
    assert.equal(apple?.id, 'apple');
    assert.equal(apple?.image, itemSets.mixed.find((i) => i.id === 'apple')?.image);
  });

  it('includes the letters of the language own alphabet, not the others', () => {
    const ka = wordsFor('ka');
    assert.ok(ka.some((w) => w.label === 'ა' && w.text === 'ა' && !w.image), 'Georgian letters are recordable');
    assert.ok(!ka.some((w) => w.label === 'Щ'), 'the Russian alphabet is not in the Georgian list');
    assert.ok(wordsFor('ru').some((w) => w.label === 'Щ'));
    assert.ok(wordsFor('en').some((w) => w.label === 'W'));
  });

  it('maps existing files to labels and ignores unknown ids', () => {
    const registry = buildRegistry({ ka: { female: ['apple', 'no-such-item'], male: [] }, en: { female: [] } });
    assert.deepEqual(registry, { ka: { female: { ვაშლი: 'assets/audio/ka/female/apple.wav' } } });
  });

  it('renders a clips module that round-trips', async () => {
    const registry = buildRegistry({ ka: { female: ['apple'], male: ['apple', 'cat'] } });
    const source = renderClipsModule(registry);
    const module = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    assert.deepEqual(module.clips, registry);
    assert.deepEqual(renderClipsModule({}), renderClipsModule({}));
    assert.ok(renderClipsModule({}).includes('export const clips = {};'));
  });

  it('rewrites only the clips block of sw.js', () => {
    // Start from sw.js with an empty block, whatever has been recorded so far.
    const empty = updateServiceWorker(serviceWorker, {});
    const registry = buildRegistry({ ka: { male: ['apple'] } });
    const updated = updateServiceWorker(empty, registry);
    assert.ok(updated.includes("  'assets/audio/ka/male/apple.wav',\n  // clips:end"));
    assert.equal(updated.replace("  'assets/audio/ka/male/apple.wav',\n", ''), empty, 'nothing outside the block changes');
    assert.equal(updateServiceWorker(updated, {}), empty, 'emptying the block restores the original');
    assert.throws(() => updateServiceWorker('nothing here', registry));
  });
});
