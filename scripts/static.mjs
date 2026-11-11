// @ts-check
/**
 * Serves the project's files as they are, for the development servers
 * (scripts/serve.mjs and scripts/record-server.mjs). No dependencies.
 */

import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

/** @type {Record<string, string>} */
export const MIME = {
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
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.md': 'text/markdown; charset=utf-8',
  // So a phone offers to install the local CA rather than downloading it.
  '.pem': 'application/x-x509-ca-cert',
  '.crt': 'application/x-x509-ca-cert',
  '.mobileconfig': 'application/x-apple-aspen-config',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * The file a request path names inside `root`, or null if it would leave it.
 * A path ending in / means its index.html.
 * @param {string} root absolute folder
 * @param {string} urlPath the request URL (path and query)
 */
export function resolvePath(root, urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const base = normalize(root.endsWith(sep) ? root : root + sep);
  const file = normalize(join(base, pathname));
  return file.startsWith(base) ? file : null;
}

/**
 * Answers a GET for a file under `root`. Nothing is cached, so an edit shows
 * on the next reload.
 * @param {string} root
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function serveStatic(root, req, res) {
  const file = resolvePath(root, req.url ?? '/');
  if (!file) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}
