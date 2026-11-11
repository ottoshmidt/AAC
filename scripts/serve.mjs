// @ts-check
/**
 * Serves the app for development:
 *
 *   npm start                 then open http://localhost:8080
 *
 * PORT=<n> picks another port. Only this computer can open it; HOST=0.0.0.0
 * also lets other devices on the network in (it serves every file in the
 * project). No dependencies; any static web server works just as well
 * (see README, Run it).
 */

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '127.0.0.1';

createServer((req, res) => {
  serveStatic(ROOT, req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(PORT, HOST, () => {
  console.log(`AAC Games: http://localhost:${PORT}`);
});
