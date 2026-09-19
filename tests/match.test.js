import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MatchRound } from '../js/games/match.js';
import { SHAPES, shapesFor } from '../js/shapes.js';

/** A shuffle that keeps the given order, so rounds are predictable in tests. */
const inOrder = (n) => Array.from({ length: n }, (_, i) => i);
/** A shuffle that reverses, used for the slot row. */
const reversed = (n) => Array.from({ length: n }, (_, i) => n - 1 - i);

/** A round of `count` shapes whose rows are laid out predictably. */
function round(count, order = inOrder) {
  return new MatchRound(shapesFor(count), order);
}

describe('shapes', () => {
  it('gives 2 to 4 shapes, always starting with the same ones', () => {
    assert.deepEqual(
      shapesFor(2).map((s) => s.id),
      ['circle', 'square'],
    );
    assert.equal(shapesFor(4).length, 4);
    assert.equal(shapesFor(1).length, 2, 'never fewer than two');
    assert.equal(shapesFor(9).length, SHAPES.length, 'never more than there are');
  });

  it('has a name in every language and a drawing for every shape', () => {
    for (const shape of SHAPES) {
      for (const lang of ['ka', 'en', 'ru']) assert.ok(shape.label[lang], `${shape.id}: no ${lang} name`);
      assert.match(shape.path, /^M/, `${shape.id}: no path`);
      // The viewBox is the path's own bounds, so the shape fills its cell.
      assert.match(shape.box, /^-?\d+ -?\d+ \d+ \d+$/, `${shape.id}: no viewBox`);
      assert.match(shape.color, /^#[0-9a-f]{6}$/, `${shape.id}: no colour`);
    }
    assert.equal(new Set(SHAPES.map((s) => s.id)).size, SHAPES.length, 'ids are unique');
  });
});

describe('MatchRound', () => {
  it('deals every shape once into both rows', () => {
    const r = round(4);
    assert.deepEqual([...r.top].sort(), [...r.slots].sort());
    assert.equal(new Set(r.top).size, 4);
    assert.equal(r.filled.size, 0);
    assert.equal(r.picked, null);
    assert.equal(r.done, false);
  });

  it('shuffles the slots away from the top row, so the answer is never straight down', () => {
    // An order that would repeat the top row is dealt again (see deal()).
    let calls = 0;
    const sameThenReversed = (n) => (calls++ < 2 ? inOrder(n) : reversed(n));
    const r = new MatchRound(shapesFor(3), sameThenReversed);
    assert.notDeepEqual(r.slots, r.top);
  });

  it('places a shape in its matching slot', () => {
    const r = round(2, inOrder);
    r.slots = [...r.top].reverse(); // circle on top-left, its slot bottom-right
    assert.equal(r.pick(0), true);
    assert.equal(r.picked, 0);
    assert.equal(r.place(1), true, 'the slot of the same shape');
    assert.equal(r.filled.has(1), true);
    assert.equal(r.picked, null, 'the shape is no longer held');
    assert.deepEqual(r.remaining(), [1], 'only the other shape is left');
    assert.deepEqual(r.empty(), [0]);
  });

  it('sends a shape back to the row when the slot is wrong, costing nothing', () => {
    const r = round(2);
    r.slots = [...r.top].reverse();
    r.pick(0);
    assert.equal(r.place(0), false, 'the wrong slot');
    assert.equal(r.filled.size, 0, 'nothing is filled');
    assert.equal(r.picked, null, 'the shape is let go');
    assert.deepEqual(r.remaining(), [0, 1], 'both can still be placed');
  });

  it('ignores a shape already placed and a slot already filled', () => {
    const r = round(2);
    r.slots = [...r.top].reverse();
    r.pick(0);
    r.place(1);
    assert.equal(r.pick(0), false, 'that shape is gone from the row');
    assert.equal(r.picked, null);
    assert.equal(r.pick(1), true);
    assert.equal(r.place(1), false, 'that slot is taken');
    assert.equal(r.picked, 1, 'and the shape is still held');
  });

  it('places nothing when no shape is held', () => {
    const r = round(2);
    assert.equal(r.place(0), false);
    assert.equal(r.filled.size, 0);
  });

  it('is done when every slot is filled, and a new deal starts over', () => {
    const r = round(3);
    for (const slot of [0, 1, 2]) {
      const shape = r.top.indexOf(r.slots[slot]);
      r.pick(shape);
      assert.equal(r.place(slot), true);
    }
    assert.equal(r.done, true);
    assert.deepEqual(r.remaining(), []);
    r.deal();
    assert.equal(r.done, false);
    assert.equal(r.filled.size, 0);
    assert.equal(r.remaining().length, 3);
  });

  it('knows which shape a row position and a slot belong to', () => {
    const r = round(3);
    assert.equal(r.shapeAt(0).id, r.top[0]);
    assert.equal(r.slotShape(2).id, r.slots[2]);
  });
});
