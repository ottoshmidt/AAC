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
    const result = sanitize({ intervalMs: 3000, speakOnSelect: false, voiceEn: 'Alex' });
    assert.equal(result.intervalMs, 3000);
    assert.equal(result.speakOnSelect, false);
    assert.equal(result.voiceEn, 'Alex');
  });

  it('clamps numbers to their limits', () => {
    assert.equal(sanitize({ intervalMs: 10 }).intervalMs, LIMITS.intervalMs.min);
    assert.equal(sanitize({ intervalMs: 999999 }).intervalMs, LIMITS.intervalMs.max);
    assert.equal(sanitize({ maxCycles: -3 }).maxCycles, 0);
  });

  it('allows only 2 or 4 pictures per round, defaulting to 4', () => {
    assert.equal(DEFAULTS.choicesPerRound, 4);
    assert.equal(sanitize({ choicesPerRound: 2 }).choicesPerRound, 2);
    assert.equal(sanitize({ choicesPerRound: 3 }).choicesPerRound, 4);
    assert.equal(sanitize({ choicesPerRound: '2' }).choicesPerRound, 4);
  });

  it('accepts only known languages', () => {
    assert.equal(sanitize({ language: 'ka' }).language, 'ka');
    assert.equal(sanitize({ language: 'en' }).language, 'en');
    assert.equal(sanitize({ language: 'xx' }).language, DEFAULTS.language);
  });

  it('defaults Georgian to the in-app voice', () => {
    assert.equal(DEFAULTS.voiceKa, 'piper:ka_GE-natia-medium');
  });

  it('carries the old single voiceName over to English', () => {
    assert.equal(sanitize({ voiceName: 'Alex' }).voiceEn, 'Alex');
    assert.equal(sanitize({ voiceName: 'Alex', voiceEn: 'Samantha' }).voiceEn, 'Samantha');
    assert.ok(!('voiceName' in sanitize({ voiceName: 'Alex' })));
  });

  it('ignores wrong types, NaN and unknown keys', () => {
    const result = sanitize({ intervalMs: '3000', cooldownMs: NaN, fullscreen: 'yes', extra: 1 });
    assert.equal(result.intervalMs, DEFAULTS.intervalMs);
    assert.equal(result.cooldownMs, DEFAULTS.cooldownMs);
    assert.equal(result.fullscreen, DEFAULTS.fullscreen);
    assert.ok(!('extra' in result));
  });
});
