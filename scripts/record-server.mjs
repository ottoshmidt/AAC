// @ts-check
/**
 * Development server for recording words: serves the project like
 * `python3 -m http.server`, and saves clips posted by record.html.
 *
 *   npm run record            then open http://localhost:8080/record.html
 *
 * API (used by js/record.js):
 *   GET    /api/clips                    the registry (language -> label -> file)
 *   POST   /api/clips/<lang>/<id>.wav    save a clip (body: the WAV bytes)
 *   DELETE /api/clips/<lang>/<id>.wav    remove it
 * After every change js/clips.js and the clips block in sw.js are rewritten.
 *
 * No dependencies. Recording needs a secure context, so use it on localhost.
 */

import { createServer } from 'node:http';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRegistry, clipPath, renderClipsModule, updateServiceWorker } from './clips-registry.mjs';
import { LANGUAGES } from '../js/i18n.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Existing clip files: lang -> ids. */
async function scanClips() {
  /** @type {Record<string, string[]>} */
  const files = {};
  for (const lang of Object.keys(LANGUAGES)) {
    try {
      const names = await readdir(join(ROOT, 'assets/audio', lang));
      files[lang] = names.filter((n) => n.endsWith('.wav')).map((n) => n.slice(0, -4));
    } catch {
      files[lang] = [];
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

  const match = url.pathname.match(/^\/api\/clips\/([a-z]{2})\/([a-z0-9-]+)\.wav$/);
  if (!match) return json(res, 404, { error: 'not found' });
  const [, lang, id] = match;
  if (!(lang in LANGUAGES)) return json(res, 400, { error: `unknown language ${lang}` });
  const file = join(ROOT, clipPath(lang, id));

  if (req.method === 'POST') {
    const body = await readBody(req);
    if (body.length < 44 || body.toString('latin1', 0, 4) !== 'RIFF') return json(res, 400, { error: 'not a WAV file' });
    await mkdir(join(ROOT, 'assets/audio', lang), { recursive: true });
    await writeFile(file, body);
    console.log(`saved ${clipPath(lang, id)} (${body.length} bytes)`);
    return json(res, 200, { path: clipPath(lang, id), clips: await regenerate() });
  }
  if (req.method === 'DELETE') {
    await unlink(file).catch(() => {});
    console.log(`removed ${clipPath(lang, id)}`);
    return json(res, 200, { clips: await regenerate() });
  }
  return json(res, 405, { error: 'method not allowed' });
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
async function handleStatic(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = normalize(join(ROOT, pathname));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

createServer(async (req, res) => {
  try {
    if (req.url?.startsWith('/api/')) await handleApi(req, res);
    else await handleStatic(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: String(error) });
  }
}).listen(PORT, () => {
  console.log(`Recording page: http://localhost:${PORT}/record.html`);
});
