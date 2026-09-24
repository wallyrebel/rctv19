import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';
test('embed is frameable, catalog is public, private files are unreachable', async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const embed = await fetch(`${base}/embed/rctv19`); assert.equal(embed.status, 200); assert.match(embed.headers.get('content-security-policy'), /frame-ancestors \*/); assert.equal(embed.headers.get('x-frame-options'), null);
    const catalog = await fetch(`${base}/api/catalog.json`); assert.equal(catalog.headers.get('access-control-allow-origin'), '*'); assert.equal((await catalog.json()).channel.id, 'rctv19');
    for (const pathname of ['/server.mjs', '/.env', '/package.json', '/catalog/rctv19.json', '/%2e%2e/package.json']) assert.equal((await fetch(base + pathname)).status, 404);
    assert.equal((await fetch(`${base}/api/catalog.json`, { method: 'POST' })).status, 405);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
