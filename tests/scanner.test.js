import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { Scanner } from '../js/scanner.js';

/** Build a scanner and record every event it emits as [type, index?]. */
function setup(overrides = {}) {
  const scanner = new Scanner({
    itemCount: 2,
    intervalMs: 1000,
    cooldownMs: 500,
    debounceMs: 200,
    maxCycles: 0,
    now: () => Date.now(),
    ...overrides,
  });
  const events = [];
  for (const type of ['highlight', 'select', 'pause', 'resume', 'stop']) {
    scanner.addEventListener(type, (e) => events.push(e.detail.index === undefined ? [type] : [type, e.detail.index]));
  }
  return { scanner, events };
}

/**
 * Advance the mock clock in steps. A single tick() doesn't fire timers that
 * are scheduled while it runs, and the scanner schedules each step from the
 * previous one.
 */
function ticks(count, ms) {
  for (let i = 0; i < count; i++) mock.timers.tick(ms);
}

describe('Scanner', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'] }));
  afterEach(() => mock.timers.reset());

  it('highlights the first item on start and alternates at the interval', () => {
    const { scanner, events } = setup();
    scanner.start();
    assert.deepEqual(events, [['highlight', 0]]);
    mock.timers.tick(1000);
    mock.timers.tick(1000);
    mock.timers.tick(1000);
    assert.deepEqual(events, [['highlight', 0], ['highlight', 1], ['highlight', 0], ['highlight', 1]]);
  });

  it('selects the highlighted item on press, wherever the click was', () => {
    const { scanner, events } = setup();
    scanner.start();
    mock.timers.tick(1000);
    scanner.press();
    assert.deepEqual(events.at(-1), ['select', 1]);
    assert.equal(scanner.state, 'selected');
  });

  it('ignores presses during the cooldown, then restarts from the first item', () => {
    const { scanner, events } = setup();
    scanner.start();
    scanner.press();
    mock.timers.tick(300); // past debounce, still in cooldown
    scanner.press();
    assert.equal(events.filter(([type]) => type === 'select').length, 1);
    mock.timers.tick(200);
    assert.deepEqual(events.at(-1), ['highlight', 0]);
    assert.equal(scanner.state, 'scanning');
  });

  it('ignores presses closer together than the debounce time', () => {
    const { scanner, events } = setup({ cooldownMs: 0 });
    scanner.start();
    scanner.press();
    mock.timers.tick(0); // cooldown of 0 resumes scanning immediately
    mock.timers.tick(100);
    scanner.press(); // 100 ms after the first press: ignored
    assert.equal(events.filter(([type]) => type === 'select').length, 1);
    mock.timers.tick(150);
    scanner.press(); // 250 ms after the first press: accepted
    assert.equal(events.filter(([type]) => type === 'select').length, 2);
  });

  it('pauses after maxCycles full cycles without a selection and resumes on press', () => {
    const { scanner, events } = setup({ maxCycles: 2 });
    scanner.start();
    ticks(4, 1000); // 0,1,0,1 then pause
    assert.deepEqual(events, [
      ['highlight', 0],
      ['highlight', 1],
      ['highlight', 0],
      ['highlight', 1],
      ['pause'],
    ]);
    assert.equal(scanner.state, 'paused');
    mock.timers.tick(5000);
    assert.equal(events.length, 5, 'no activity while paused');
    scanner.press();
    assert.deepEqual(events.slice(5), [['resume'], ['highlight', 0]]);
  });

  it('a press that resumes from pause does not also select', () => {
    const { scanner, events } = setup({ maxCycles: 1 });
    scanner.start();
    ticks(2, 1000);
    scanner.press();
    assert.ok(!events.some(([type]) => type === 'select'));
  });

  it('starts a new round on start and after each selection, before the first highlight', () => {
    const { scanner } = setup();
    const order = [];
    scanner.addEventListener('round', () => order.push('round'));
    scanner.addEventListener('highlight', (e) => order.push(`h${e.detail.index}`));
    scanner.addEventListener('select', (e) => order.push(`s${e.detail.index}`));
    scanner.start();
    mock.timers.tick(1000);
    scanner.press();
    mock.timers.tick(500); // cooldown ends
    assert.deepEqual(order, ['round', 'h0', 'h1', 's1', 'round', 'h0']);
  });

  it('does not start a new round when resuming from a pause', () => {
    const { scanner } = setup({ maxCycles: 1 });
    let rounds = 0;
    scanner.addEventListener('round', () => rounds++);
    scanner.start();
    ticks(2, 1000);
    scanner.press();
    assert.equal(rounds, 1);
  });

  it('scans across a changed item count', () => {
    const { scanner, events } = setup({ itemCount: 2 });
    scanner.addEventListener('round', () => scanner.updateOptions({ itemCount: 4 }));
    scanner.start();
    ticks(4, 1000);
    assert.deepEqual(
      events.map(([, i]) => i),
      [0, 1, 2, 3, 0],
    );
  });

  it('stays stopped when a listener calls stop() inside select', () => {
    const { scanner, events } = setup();
    scanner.addEventListener('select', () => scanner.stop());
    scanner.start();
    scanner.press();
    ticks(10, 1000);
    assert.deepEqual(events.slice(1), [['select', 0], ['stop']]);
    assert.equal(scanner.state, 'idle');
  });

  it('does not double up when a listener calls start() inside select', () => {
    const { scanner, events } = setup();
    scanner.addEventListener('select', () => scanner.start());
    scanner.start();
    scanner.press();
    ticks(3, 1000);
    // After the restart: highlight 0, then one highlight per interval; no
    // extra round from the old cooldown timer.
    assert.deepEqual(events.slice(1), [['select', 0], ['highlight', 0], ['highlight', 1], ['highlight', 0], ['highlight', 1]]);
  });

  it('does nothing after stop', () => {
    const { scanner, events } = setup();
    scanner.start();
    scanner.stop();
    mock.timers.tick(5000);
    scanner.press();
    assert.deepEqual(events, [['highlight', 0], ['stop']]);
  });

  it('applies a new interval from the next step', () => {
    const { scanner, events } = setup();
    scanner.start();
    scanner.updateOptions({ intervalMs: 3000 });
    mock.timers.tick(1000); // step already scheduled with the old interval
    mock.timers.tick(1000);
    assert.equal(events.length, 2);
    mock.timers.tick(2000);
    assert.equal(events.length, 3);
  });
});
