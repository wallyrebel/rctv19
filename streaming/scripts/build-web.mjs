import { mkdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalog } from '../lib/catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.env.WEB_OUTPUT_DIRECTORY || path.join(root, 'dist/web'));
const catalog = JSON.parse(await readFile(process.env.CATALOG_PATH || path.join(root, 'catalog/rctv19.json'), 'utf8'));
const errors = validateCatalog(catalog);
if (errors.length) throw new Error(errors.join('\n'));
// An explicit allowlist keeps credentials, source and recordings out of the upload.
for (const [source, target] of [
  ['public/index.html','index.html'],
  ['public/index.html','watch/rctv19/index.html'],
  ['public/index.html','embed/rctv19/index.html'],
  ['public/privacy.html','privacy/index.html'],
  ['public/support.html','support/index.html'],
  ['public/terms.html','terms/index.html'],
  ['public/styles.css','styles.css'], ['public/app.js','app.js'],
  ['public/assets/logo.png','assets/logo.png'],
  ['public/assets/live-cover.png','assets/live-cover.png'],
  ['public/assets/show-placeholder.png','assets/show-placeholder.png'],
  ['node_modules/hls.js/dist/hls.min.js','vendor/hls.min.js'],
]) {
  await mkdir(path.dirname(path.join(out,target)), { recursive:true });
  await copyFile(path.join(root,source),path.join(out,target));
}
await mkdir(path.join(out,'api'), {recursive:true});
await writeFile(path.join(out,'api/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
await writeFile(path.join(out,'404.html'),'<!doctype html><title>Not found</title><h1>Not found</h1><a href="/watch/rctv19">Return to RCTV 19</a>');
await writeFile(path.join(out,'_headers'),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' https: blob:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors *; object-src 'none'; base-uri 'none'
/api/catalog.json
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=30
`);
console.log('Cloudflare static player and shared catalog built in dist/web.');
