// @ts-check
/**
 * Development server for recording words: serves the project like
 * `npm start`, and saves clips posted by record.html.
 *
 *   npm run record            then open http://localhost:8888/record.html
 *
 * API (used by js/record.js):
 *   GET    /api/clips                    the registry (language -> label -> file)
 *   POST   /api/clips/<lang>/<voice>/<id>.wav    save a clip (body: the WAV bytes)
 *   DELETE /api/clips/<lang>/<voice>/<id>.wav    remove it
 * After every change js/clips.js and the clips block in sw.js are rewritten.
 *
 * No dependencies. Recording needs a secure context, so use it on localhost.
 */

import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { networkInterfaces } from 'node:os';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRegistry, clipPath, renderClipsModule, updateServiceWorker } from './clips-registry.mjs';
import { serveStatic } from './static.mjs';
import { LANGUAGES } from '../js/i18n.js';
import { RECORDED_VOICES } from '../js/items.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PORT = Number(process.env.PORT ?? 8888);
// HTTPS, needed to record from a phone or another computer: a browser only
// opens the microphone on a secure origin, and localhost is the one exception.
// See README (Recording from another device) for making these with mkcert.
const CERT = process.env.RECORD_CERT ?? join(ROOT, 'certs/cert.pem');
const KEY = process.env.RECORD_KEY ?? join(ROOT, 'certs/key.pem');

/** Existing clip files: lang -> voice -> ids. */
async function scanClips() {
  /** @type {Record<string, Record<string, string[]>>} */
  const files = {};
  for (const lang of Object.keys(LANGUAGES)) {
    files[lang] = {};
    for (const voice of RECORDED_VOICES) {
      try {
        const names = await readdir(join(ROOT, 'assets/audio', lang, voice));
        files[lang][voice] = names.filter((n) => n.endsWith('.wav')).map((n) => n.slice(0, -4));
      } catch {
        files[lang][voice] = [];
      }
    }
  }
  return files;
}

/** Rebuild js/clips.js and the clips block of sw.js from the files on disk. */
async function regenerate() {
  const registry = buildRegistry(await scanClips());
  await writeFile(join(ROOT, 'js/clips.js'), renderClipsModule(registry));
  const swPath = join(ROOT, 'sw.js');
  await writeFile(swPath, updateServiceWorker(await readFile(swPath, 'utf8'), registry));
  return registry;
}

/** @param {import('node:http').IncomingMessage} req */
function readBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 */
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
async function handleApi(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/api/clips' && req.method === 'GET') return json(res, 200, await regenerate());

  const match = url.pathname.match(/^\/api\/clips\/([a-z]{2})\/([a-z]+)\/([a-z0-9-]+)\.wav$/);
  if (!match) return json(res, 404, { error: 'not found' });
  const [, lang, voice, id] = match;
  if (!(lang in LANGUAGES)) return json(res, 400, { error: `unknown language ${lang}` });
  if (!RECORDED_VOICES.includes(/** @type {any} */ (voice))) return json(res, 400, { error: `unknown voice ${voice}` });
  const file = join(ROOT, clipPath(lang, voice, id));

  if (req.method === 'POST') {
    const body = await readBody(req);
    if (body.length < 44 || body.toString('latin1', 0, 4) !== 'RIFF') return json(res, 400, { error: 'not a WAV file' });
    await mkdir(join(ROOT, 'assets/audio', lang, voice), { recursive: true });
    await writeFile(file, body);
    console.log(`saved ${clipPath(lang, voice, id)} (${body.length} bytes)`);
    return json(res, 200, { path: clipPath(lang, voice, id), clips: await regenerate() });
  }
  if (req.method === 'DELETE') {
    await unlink(file).catch(() => {});
    console.log(`removed ${clipPath(lang, voice, id)}`);
    return json(res, 200, { clips: await regenerate() });
  }
  return json(res, 405, { error: 'method not allowed' });
}

/** The certificate and key, if both are there; otherwise plain HTTP. */
async function certificate() {
  try {
    return { cert: await readFile(CERT), key: await readFile(KEY) };
  } catch {
    return null;
  }
}

/** This machine's addresses on the network, for the lines printed at startup. */
function addresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => /** @type {{ address: string }} */ (i).address);
}

/** @param {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void} handler */
async function serve(handler) {
  const tls = await certificate();
  const server = tls ? createSecureServer(tls, handler) : createServer(handler);
  const scheme = tls ? 'https' : 'http';
  server.listen(PORT, () => {
    console.log(`Recording page: ${scheme}://localhost:${PORT}/record.html`);
    for (const address of tls ? addresses() : []) {
      console.log(`         or on: ${scheme}://${address}:${PORT}/record.html`);
    }
    if (!tls) console.log('(HTTP only: recording works on this machine. For a phone, see the README.)');
  });
}

serve(async (req, res) => {
  try {
    if (req.url?.startsWith('/api/')) await handleApi(req, res);
    else await serveStatic(ROOT, req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: String(error) });
  }
});
