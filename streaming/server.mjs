import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateCatalog } from './lib/catalog.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const routes = new Map([
  ['/', 'public/index.html'], ['/watch/rctv19', 'public/index.html'],
  ['/embed/rctv19', 'public/index.html'], ['/embed/rctv19/', 'public/index.html'],
  ['/styles.css', 'public/styles.css'], ['/app.js', 'public/app.js'],
  ['/assets/logo.png', 'public/assets/logo.png'],
  ['/vendor/hls.min.js', 'node_modules/hls.js/dist/hls.min.js']
]);

export function createServer({ catalogPath = process.env.CATALOG_PATH || path.join(root, 'catalog/rctv19.json') } = {}) {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Deliberately permit cross-origin framing so the public player can be embedded.
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' https: blob:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors *; object-src 'none'; base-uri 'none'");
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD, OPTIONS' }); return res.end(); }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/catalog.json') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      try {
        const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
        if (validateCatalog(catalog).length) throw new Error('Invalid catalog');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' });
        return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(catalog));
      } catch {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ error: 'Programming is temporarily unavailable.' }));
      }
    }
    if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"status":"ok"}'); }
    const file = routes.get(url.pathname);
    if (!file) { res.writeHead(404); return res.end('Not found'); }
    try {
      const body = await readFile(path.join(root, file));
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(503); res.end('Player is temporarily unavailable.'); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '127.0.0.1';
  createServer().listen(port, host, () => console.log(`RCTV 19 player: http://${host}:${port}/watch/rctv19`));
}
