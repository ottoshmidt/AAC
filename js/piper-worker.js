// @ts-check
/**
 * Worker that runs a Piper voice, so downloading the model and synthesising
 * words never block the interface. Started by js/piper.js.
 *
 * Messages in:  { type: 'load', id }            download and initialise
 *               { type: 'say', id, ref, text }  synthesise one word
 * Messages out: { type: 'progress', loaded, total }
 *               { type: 'ready' } | { type: 'error', message }
 *               { type: 'wav', ref, wav } | { type: 'failed', ref, message }
 */

import { PiperEngine } from './piper-engine.js';

/** @type {PiperEngine | null} */
let engine = null;

/** @param {string} id */
function engineFor(id) {
  if (!engine || engine.id !== id) engine = new PiperEngine(id);
  return engine;
}

self.addEventListener('message', async (event) => {
  const message = event.data;
  try {
    if (message.type === 'load') {
      await engineFor(message.id).load((loaded, total) => self.postMessage({ type: 'progress', loaded, total }));
      self.postMessage({ type: 'ready' });
    } else if (message.type === 'say') {
      const voice = engineFor(message.id);
      await voice.load((loaded, total) => self.postMessage({ type: 'progress', loaded, total }));
      const wav = await voice.say(message.text);
      self.postMessage({ type: 'wav', ref: message.ref, wav }, [wav]);
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (message.type === 'say') self.postMessage({ type: 'failed', ref: message.ref, message: text });
    else self.postMessage({ type: 'error', message: text });
  }
});
