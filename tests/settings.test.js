import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULTS, LIMITS, sanitize } from '../js/settings.js';

describe('sanitize', () => {
  it('returns the defaults for missing or invalid input', () => {
    assert.deepEqual(sanitize(undefined), DEFAULTS);
    assert.deepEqual(sanitize(null), DEFAULTS);
    assert.deepEqual(sanitize('garbage'), DEFAULTS);
    assert.deepEqual(sanitize({}), DEFAULTS);
  });

  it('keeps valid values', () => {
    const result = sanitize({ intervalMs: 3000, speakOnSelect: false, voiceName: 'Alex' });
    assert.equal(result.intervalMs, 3000);
    assert.equal(result.speakOnSelect, false);
    assert.equal(result.voiceName, 'Alex');
  });

  it('clamps numbers to their limits', () => {
    assert.equal(sanitize({ intervalMs: 10 }).intervalMs, LIMITS.intervalMs.min);
    assert.equal(sanitize({ intervalMs: 999999 }).intervalMs, LIMITS.intervalMs.max);
    assert.equal(sanitize({ maxCycles: -3 }).maxCycles, 0);
  });

  it('ignores wrong types, NaN and unknown keys', () => {
    const result = sanitize({ intervalMs: '3000', cooldownMs: NaN, fullscreen: 'yes', extra: 1 });
    assert.equal(result.intervalMs, DEFAULTS.intervalMs);
    assert.equal(result.cooldownMs, DEFAULTS.cooldownMs);
    assert.equal(result.fullscreen, DEFAULTS.fullscreen);
    assert.ok(!('extra' in result));
  });
});
