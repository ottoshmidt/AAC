import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIME, resolvePath } from '../scripts/static.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

describe('static server', () => {
  it('maps a request path to the file under the project', () => {
    assert.equal(resolvePath(ROOT, '/js/main.js?v=2'), join(ROOT, 'js/main.js'));
    assert.equal(resolvePath(ROOT, '/'), join(ROOT, 'index.html'));
    assert.equal(resolvePath(ROOT, '/assets/%E1%83%90.svg'), join(ROOT, 'assets/ა.svg'));
  });

  it('never leaves the project folder', () => {
    for (const path of ['/../package.json', '/%2e%2e/%2e%2e/secret', '/..%5c..%5csecret', '/a/..%2f..%2f..%2fsecret']) {
      const file = resolvePath(ROOT, path);
      // Refused, or a file inside the project (how a backslash counts differs by OS).
      assert.ok(file === null || file.startsWith(ROOT), `${path} -> ${file}`);
    }
    assert.equal(resolvePath(ROOT, '/%E0%A4%A'), null);
  });

  it('serves modules and the service worker as JavaScript', () => {
    assert.match(MIME['.js'], /^text\/javascript/);
    assert.match(MIME['.mjs'], /^text\/javascript/);
  });
});
