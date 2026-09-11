import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PageProgress, pageCount, pageIndices, wrapPage } from '../js/pages.js';

describe('pages', () => {
  it('splits 24 pictures into 6 pages of 4 or 12 pages of 2', () => {
    assert.equal(pageCount(24, 4), 6);
    assert.equal(pageCount(24, 2), 12);
    assert.deepEqual(pageIndices(24, 4, 0), [0, 1, 2, 3]);
    assert.deepEqual(pageIndices(24, 4, 5), [20, 21, 22, 23]);
    assert.deepEqual(pageIndices(24, 2, 11), [22, 23]);
  });

  it('covers every picture exactly once', () => {
    const all = Array.from({ length: pageCount(24, 4) }, (_, p) => pageIndices(24, 4, p)).flat();
    assert.deepEqual(all, Array.from({ length: 24 }, (_, i) => i));
  });

  it('makes a shorter last page when the pool does not divide evenly', () => {
    assert.equal(pageCount(10, 4), 3);
    assert.deepEqual(pageIndices(10, 4, 2), [8, 9]);
    assert.equal(pageCount(0, 4), 1);
    assert.deepEqual(pageIndices(0, 4, 0), []);
  });

  it('wraps around in both directions', () => {
    assert.equal(wrapPage(6, 6), 0);
    assert.equal(wrapPage(-1, 6), 5);
    assert.equal(wrapPage(3, 6), 3);
  });
});

describe('PageProgress', () => {
  it('scans only the pictures not chosen yet', () => {
    const p = new PageProgress(24, 4);
    assert.deepEqual(p.remaining, [0, 1, 2, 3]);
    p.choose(2);
    p.choose(0);
    assert.deepEqual(p.remaining, [1, 3]);
    assert.equal(p.startRound(), false);
    assert.equal(p.page, 0);
  });

  it('moves to the next page once every picture has been chosen', () => {
    const p = new PageProgress(24, 4);
    [0, 1, 2, 3].forEach((slot) => p.choose(slot));
    assert.equal(p.startRound(), true);
    assert.equal(p.page, 1);
    assert.deepEqual(p.pictures, [4, 5, 6, 7]);
    assert.deepEqual(p.remaining, [0, 1, 2, 3], 'the new page starts fresh');
  });

  it('starts over at the first page after the last one', () => {
    const p = new PageProgress(24, 4);
    for (let page = 0; page < 6; page++) {
      assert.equal(p.page, page);
      p.pictures.forEach((_, slot) => p.choose(slot));
      p.startRound();
    }
    assert.equal(p.page, 0);
  });

  it('finishes a shorter last page after its own pictures', () => {
    const p = new PageProgress(10, 4);
    p.turn(2); // last page has pictures 8 and 9
    assert.deepEqual(p.remaining, [0, 1]);
    p.choose(0);
    p.choose(1);
    assert.equal(p.startRound(), true);
    assert.equal(p.page, 0);
  });

  it('starts a page fresh when turned by hand', () => {
    const p = new PageProgress(24, 4);
    p.choose(1);
    p.turn(+1);
    p.turn(-1);
    assert.deepEqual(p.remaining, [0, 1, 2, 3]);
    p.turn(-1);
    assert.equal(p.page, 5, 'wraps backwards');
  });

  it('keeps the first picture in view when the page size changes', () => {
    const p = new PageProgress(24, 4);
    p.turn(2); // pictures 8..11
    p.choose(0);
    p.setPerPage(2);
    assert.equal(p.page, 4);
    assert.deepEqual(p.pictures, [8, 9]);
    assert.deepEqual(p.remaining, [0, 1]);
  });
});
