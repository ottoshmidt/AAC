import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildRegistry, renderClipsModule, updateServiceWorker, wordsFor } from '../scripts/clips-registry.mjs';
import { itemSets } from '../js/items.js';

const serviceWorker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

describe('clip registry', () => {
  it('lists one word per distinct label, named after the first item with it', () => {
    const words = wordsFor('ka');
    const labels = words.map((w) => w.label);
    assert.equal(new Set(labels).size, labels.length);
    assert.ok(words.length < Object.values(itemSets).flat().length, 'shared words are recorded once');
    const apple = words.find((w) => w.label === 'ვაშლი');
    assert.equal(apple?.id, 'apple');
    assert.equal(apple?.image, itemSets.mixed.find((i) => i.id === 'apple')?.image);
  });

  it('maps existing files to labels and ignores unknown ids', () => {
    const registry = buildRegistry({ ka: ['apple', 'no-such-item'], en: [] });
    assert.deepEqual(registry, { ka: { ვაშლი: 'assets/audio/ka/apple.wav' } });
  });

  it('renders a clips module that round-trips', async () => {
    const registry = buildRegistry({ ka: ['apple', 'cat'] });
    const source = renderClipsModule(registry);
    const module = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    assert.deepEqual(module.clips, registry);
    assert.deepEqual(renderClipsModule({}), renderClipsModule({}));
    assert.ok(renderClipsModule({}).includes('export const clips = {};'));
  });

  it('rewrites only the clips block of sw.js', () => {
    const registry = buildRegistry({ ka: ['apple'] });
    const updated = updateServiceWorker(serviceWorker, registry);
    assert.ok(updated.includes("  'assets/audio/ka/apple.wav',\n  // clips:end"));
    assert.equal(updateServiceWorker(updated, {}), serviceWorker, 'emptying the block restores the original');
    assert.throws(() => updateServiceWorker('nothing here', registry));
  });
});
