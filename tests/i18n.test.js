import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LANGUAGES, missingKeys, t } from '../js/i18n.js';
import { clipFor, items, labelFor } from '../js/items.js';
import { PIPER_VOICES } from '../js/piper.js';
import { CHOICES, DEFAULTS, VOICE_KEYS } from '../js/settings.js';

describe('i18n', () => {
  it('has every string in every language', () => {
    assert.deepEqual(missingKeys(), []);
  });

  it('fills placeholders', () => {
    assert.equal(t('en', 'voiceReady', { name: 'Natia' }), 'Voice Natia is ready.');
    assert.equal(t('ka', 'voiceReady', { name: 'Natia' }), 'ხმა „Natia“ მზადაა.');
  });

  it('falls back to English, then to the key', () => {
    assert.equal(t('xx', 'settings'), 'Settings');
    assert.equal(t('en', 'no-such-key'), 'no-such-key');
  });

  it('agrees with settings about which languages exist', () => {
    assert.deepEqual(Object.keys(LANGUAGES).sort(), [...CHOICES.language].sort());
    assert.deepEqual(Object.keys(VOICE_KEYS).sort(), [...CHOICES.language].sort());
  });

  it('has in-app voices only for known languages, and valid default voices', () => {
    for (const [id, voice] of Object.entries(PIPER_VOICES)) assert.ok(voice.lang in LANGUAGES, id);
    for (const key of Object.values(VOICE_KEYS)) {
      const voice = DEFAULTS[key];
      if (voice.startsWith('piper:')) assert.ok(voice.slice(6) in PIPER_VOICES, `${key} = ${voice}`);
    }
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
