import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BUBBLE_SIZES, BubbleField, holdProgress, layout } from '../js/games/bubbles.js';

/** A predictable "random": always the middle of the range, so no jitter. */
const middle = () => 0.5;

/** Board shapes to try: square, a wide screen, a phone held upright. */
const ASPECTS = [1, 16 / 9, 3 / 4];

/** A board of `aspect`, measured in units of its own smaller side. */
const boardSize = (aspect) => ({ width: aspect >= 1 ? aspect : 1, height: aspect >= 1 ? 1 : 1 / aspect });

describe('bubble layout', () => {
  it('keeps every bubble inside the board, at every size and shape', () => {
    for (const count of [2, 3, 4, 6]) {
      for (const random of [middle, () => 0, () => 1]) {
        for (const scale of Object.values(BUBBLE_SIZES)) {
          for (const aspect of ASPECTS) {
            const board = boardSize(aspect);
            for (const b of layout(count, random, scale, aspect)) {
              // x and y are fractions of the board; the size is in units of
              // the board's smaller side, so it is converted to compare.
              const halfX = b.size / 2 / board.width;
              const halfY = b.size / 2 / board.height;
              assert.ok(b.x - halfX >= -0.001 && b.x + halfX <= 1.001, `${count}@${aspect}: x ${b.x} off the board`);
              assert.ok(b.y - halfY >= -0.001 && b.y + halfY <= 1.001, `${count}@${aspect}: y ${b.y} off the board`);
            }
          }
        }
      }
    }
  });

  it('uses the room a wide board has, rather than the room a square one would', () => {
    for (const count of [2, 3]) {
      const square = layout(count, middle, BUBBLE_SIZES.medium, 1)[0].size;
      const wide = layout(count, middle, BUBBLE_SIZES.medium, 16 / 9)[0].size;
      assert.ok(wide > square, `${count} bubbles: ${wide} should beat ${square}`);
    }
  });

  it('arranges the bubbles to suit the board it is on', () => {
    // Three bubbles: a row on a wide screen, but not on a tall one.
    const wide = layout(3, middle, BUBBLE_SIZES.medium, 16 / 9);
    assert.equal(new Set(wide.map((b) => b.y.toFixed(3))).size, 1, 'a wide board puts them in one row');
    // A phone held upright has no room for a row of three: they stack up
    // instead, which leaves each one bigger.
    const tall = layout(3, middle, BUBBLE_SIZES.medium, 3 / 4);
    assert.ok(new Set(tall.map((b) => b.y.toFixed(3))).size > 1, 'a tall board stacks them');
  });

  it('never lets two bubbles overlap, however the jitter falls', () => {
    let seed = 0;
    // Alternating extremes: neighbours are jittered towards each other.
    const worst = () => [0, 1][seed++ % 2];
    for (const count of [2, 3, 4, 6]) {
      for (const scale of Object.values(BUBBLE_SIZES)) {
        for (const aspect of ASPECTS) {
          const board = boardSize(aspect);
          const bubbles = layout(count, worst, scale, aspect);
          for (let i = 0; i < bubbles.length; i += 1) {
            for (let j = i + 1; j < bubbles.length; j += 1) {
              // Distances in the same unit as the sizes, or a wide board
              // would look as though its bubbles were on top of each other.
              const dx = (bubbles[i].x - bubbles[j].x) * board.width;
              const dy = (bubbles[i].y - bubbles[j].y) * board.height;
              const touching = (bubbles[i].size + bubbles[j].size) / 2;
              assert.ok(Math.hypot(dx, dy) >= touching - 0.001, `${count}@${aspect} at ${scale}: ${i} and ${j} overlap`);
            }
          }
        }
      }
    }
  });

  it('grows with every size step, up to the whole cell', () => {
    const sizes = ['small', 'medium', 'large', 'xlarge'].map((size) => layout(4, middle, BUBBLE_SIZES[size])[0].size);
    for (let i = 1; i < sizes.length; i += 1) {
      assert.ok(sizes[i] > sizes[i - 1], `${sizes[i - 1]} -> ${sizes[i]}: each step is bigger`);
    }
    assert.ok(sizes.at(-1) <= 0.5 + 0.001, 'four bubbles on a square board: never wider than half of it');
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
