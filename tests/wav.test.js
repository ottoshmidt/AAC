import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeWav } from '../js/wav.js';

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
