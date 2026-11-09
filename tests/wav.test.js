import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeWav, trimSilence } from '../js/wav.js';

describe('encodeWav', () => {
  it('writes a valid 16-bit mono PCM header', () => {
    const view = new DataView(encodeWav(new Float32Array(100), 22050));
    const text = (offset) => String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));
    assert.equal(view.byteLength, 44 + 200);
    assert.equal(text(0), 'RIFF');
    assert.equal(view.getUint32(4, true), view.byteLength - 8);
    assert.equal(text(8), 'WAVE');
    assert.equal(view.getUint16(20, true), 1, 'PCM');
    assert.equal(view.getUint16(22, true), 1, 'mono');
    assert.equal(view.getUint32(24, true), 22050);
    assert.equal(view.getUint16(34, true), 16, 'bits');
    assert.equal(text(36), 'data');
    assert.equal(view.getUint32(40, true), 200);
  });

  it('scales and clamps samples', () => {
    const view = new DataView(encodeWav(Float32Array.from([0, 1, -1, 2, -2, 0.5]), 8000));
    const sample = (i) => view.getInt16(44 + i * 2, true);
    assert.equal(sample(0), 0);
    assert.equal(sample(1), 32767);
    assert.equal(sample(2), -32768);
    assert.equal(sample(3), 32767);
    assert.equal(sample(4), -32768);
    assert.equal(sample(5), Math.floor(0.5 * 32767));
  });
});

describe('trimSilence', () => {
  const RATE = 16000;
  const ms = (n) => Math.round((RATE * n) / 1000);

  /** Silence, then a loud word, then a quiet tail, then silence. */
  function utterance({ tailLevel = 0.03, tailMs = 200 } = {}) {
    const samples = new Float32Array(ms(2000));
    const tone = (from, to, level) => {
      for (let i = from; i < to; i++) samples[i] = level * Math.sin((2 * Math.PI * 220 * i) / RATE);
    };
    tone(ms(500), ms(800), 0.6); // the word
    tone(ms(800), ms(800) + ms(tailMs), tailLevel); // its tail
    return samples;
  }

  it('keeps the word and its quiet tail, and drops the silence', () => {
    const clip = trimSilence(utterance(), RATE);
    // 500 ms of word and tail, plus the 80 ms and 250 ms of padding around it.
    assert.ok(clip.length >= ms(500), `the whole word is kept (${clip.length})`);
    assert.ok(clip.length <= ms(900), 'the rest of the 2 s of silence is gone');
  });

  it('does not cut a tail that an absolute threshold would call silence', () => {
    const faint = trimSilence(utterance({ tailLevel: 0.008, tailMs: 300 }), RATE);
    assert.ok(faint.length >= ms(600), `a faint tail survives (${faint.length})`);
  });

  it('fades both edges to zero, so playback cannot click', () => {
    const clip = trimSilence(utterance(), RATE);
    assert.equal(clip[0], 0);
    assert.equal(clip[clip.length - 1], 0);
    assert.ok(Math.abs(clip[Math.round(clip.length / 2)]) > 0, 'the middle is untouched');
  });

  it('reports pure silence as nothing recorded', () => {
    assert.equal(trimSilence(new Float32Array(ms(500)), RATE).length, 0);
    const hiss = Float32Array.from({ length: ms(500) }, () => (Math.random() - 0.5) * 0.002);
    assert.equal(trimSilence(hiss, RATE).length, 0, 'room noise alone is silence');
  });

  it('leaves the original samples alone', () => {
    const samples = utterance();
    const copy = Float32Array.from(samples);
    trimSilence(samples, RATE);
    assert.deepEqual(samples, copy);
  });
});
