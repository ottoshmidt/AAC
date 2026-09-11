import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LANGUAGES, missingKeys, t } from '../js/i18n.js';
import { clipFor, items, labelFor } from '../js/items.js';
import { CHOICES, VOICE_KEYS } from '../js/settings.js';

describe('i18n', () => {
  it('has every string in every language', () => {
    assert.deepEqual(missingKeys(), []);
  });

  it('fills placeholders', () => {
    assert.equal(t('en', 'voiceReady', { name: 'Natia' }), 'Voice Natia is ready.');
    assert.equal(t('ka', 'voiceReady', { name: 'Natia' }), 'ხმა „Natia“ მზადაა.');
  });

  it('falls back to English, then to the key', () => {
    assert.equal(t('xx', 'start'), 'Start');
    assert.equal(t('en', 'no-such-key'), 'no-such-key');
  });

  it('agrees with settings about which languages exist', () => {
    assert.deepEqual(Object.keys(LANGUAGES).sort(), [...CHOICES.language].sort());
    assert.deepEqual(Object.keys(VOICE_KEYS).sort(), [...CHOICES.language].sort());
  });
});

describe('items', () => {
  it('have a label in every language', () => {
    for (const item of items) {
      for (const lang of Object.keys(LANGUAGES)) assert.ok(item.label[lang], `${item.id} has no ${lang} label`);
    }
  });

  it('fall back to English labels and have no clip by default', () => {
    const item = { id: 'x', image: '', label: { en: 'X' } };
    assert.equal(labelFor(item, 'ka'), 'X');
    assert.equal(clipFor(item, 'ka'), undefined);
    assert.equal(clipFor({ ...item, audio: { ka: 'x.mp3' } }, 'ka'), 'x.mp3');
  });
});
