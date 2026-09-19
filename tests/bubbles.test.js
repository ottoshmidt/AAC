import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BubbleField, holdProgress, layout } from '../js/games/bubbles.js';

/** A predictable "random": always the middle of the range, so no jitter. */
const middle = () => 0.5;

describe('bubble layout', () => {
  it('keeps every bubble inside the board', () => {
    for (const count of [2, 3, 4, 6]) {
      for (const random of [middle, () => 0, () => 1]) {
        for (const b of layout(count, random)) {
          assert.ok(b.x - b.size / 2 >= -0.001 && b.x + b.size / 2 <= 1.001, `${count}: x ${b.x} off the board`);
          assert.ok(b.y - b.size / 2 >= -0.001 && b.y + b.size / 2 <= 1.001, `${count}: y ${b.y} off the board`);
        }
      }
    }
  });

  it('never lets two bubbles overlap, however the jitter falls', () => {
    let seed = 0;
    // Alternating extremes: neighbours are jittered towards each other.
    const worst = () => [0, 1][seed++ % 2];
    for (const count of [2, 3, 4, 6]) {
      const bubbles = layout(count, worst);
      for (let i = 0; i < bubbles.length; i += 1) {
        for (let j = i + 1; j < bubbles.length; j += 1) {
          const gap = Math.hypot(bubbles[i].x - bubbles[j].x, bubbles[i].y - bubbles[j].y);
          const touching = (bubbles[i].size + bubbles[j].size) / 2;
          assert.ok(gap >= touching - 0.001, `${count}: bubbles ${i} and ${j} overlap`);
        }
      }
    }
  });

  it('gives one bubble per count, all the same size', () => {
    const bubbles = layout(6, middle);
    assert.equal(bubbles.length, 6);
    assert.equal(new Set(bubbles.map((b) => b.size)).size, 1);
  });
});

describe('BubbleField', () => {
  it('starts with every bubble floating', () => {
    const field = new BubbleField(4, middle);
    assert.equal(field.bubbles.length, 4);
    assert.deepEqual(field.remaining(), [0, 1, 2, 3]);
    assert.equal(field.empty, false);
  });

  it('bursts a bubble once', () => {
    const field = new BubbleField(3, middle);
    assert.equal(field.burst(1), true);
    assert.deepEqual(field.remaining(), [0, 2]);
    assert.equal(field.burst(1), false, 'it is already gone');
    assert.equal(field.burst(9), false, 'there is no such bubble');
  });

  it('is empty when the last one goes, and refills', () => {
    const field = new BubbleField(2, middle);
    field.burst(0);
    assert.equal(field.empty, false);
    field.burst(1);
    assert.equal(field.empty, true);
    field.fill();
    assert.equal(field.empty, false);
    assert.equal(field.remaining().length, 2);
  });
});

describe('holdProgress', () => {
  it('fills up over the hold time and stops at full', () => {
    assert.equal(holdProgress(0, 3000), 0);
    assert.equal(holdProgress(1500, 3000), 0.5);
    assert.equal(holdProgress(3000, 3000), 1);
    assert.equal(holdProgress(9000, 3000), 1, 'never more than full');
  });

  it('survives odd values rather than showing nonsense', () => {
    assert.equal(holdProgress(-50, 3000), 0, 'a clock that jumps back');
    assert.equal(holdProgress(10, 0), 1, 'no wait at all');
  });
});
