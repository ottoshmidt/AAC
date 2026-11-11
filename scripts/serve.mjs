// @ts-check
/**
 * Serves the app for development:
 *
 *   npm start                 then open http://localhost:8080
 *
 * PORT=<n> picks another port. No dependencies; any static web server works
 * just as well (see README, Run it).
 */

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);

createServer((req, res) => {
  serveStatic(ROOT, req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(PORT, () => {
  console.log(`AAC Games: http://localhost:${PORT}`);
});
