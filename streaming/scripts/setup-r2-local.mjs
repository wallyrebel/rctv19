import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { r2CredentialFile } from '../lib/local-paths.mjs';

// One-use, loopback-only credential import. No analytics, external assets,
// credential echo, or logging of submitted values. Prepare the directory's
// Windows ACL before starting this tool. Existing credentials are never replaced.
const account = process.env.R2_ACCOUNT_ID;
if (!/^[a-f0-9]{32}$/.test(account || '')) throw new Error('Set R2_ACCOUNT_ID first.');
const bucket = process.env.R2_SETUP_BUCKET || 'rctv19-live';
if (!['rctv19-live','rctv19-vod'].includes(bucket)) throw new Error('Unsupported setup bucket.');
const destination = r2CredentialFile(bucket === 'rctv19-vod' ? 'vod' : 'live');
await access(path.dirname(destination));
const purpose = bucket.endsWith('-vod') ? 'replay library' : 'live broadcast';
const nonce = randomBytes(32).toString('hex');
const route = `/setup/${nonce}`;
let used = false;
const server = http.createServer(async (req, res) => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const respond = (status, body) => {
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      'Referrer-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  };
  if (req.headers.host !== new URL(origin).host || req.url !== route || used) {
    return respond(404, 'Not available.');
  }
  if (req.method === 'GET') return respond(200, `<!doctype html><html lang="en"><meta charset="utf-8"><title>RCTV 19 broadcaster setup</title>
    <style>body{font:18px system-ui;max-width:650px;margin:50px auto;padding:20px;background:#f5f7fb;color:#18243c}label,input{display:block}input{width:95%;padding:12px;margin:10px 0 24px}button{padding:12px 20px}</style>
    <h1>Connect the ${purpose}</h1><p>Save the ${bucket} upload credential in this computer's private local profile. It will not be included in the website or Git repository.</p>
    <form method="post" autocomplete="off"><input type="hidden" name="nonce" value="${nonce}">
    <label>Access key ID<input type="password" name="accessKeyId" autocomplete="off" required></label>
    <label>Secret access key<input type="password" name="secretAccessKey" autocomplete="off" required></label>
    <button type="submit">Save locally</button></form></html>`);
  if (req.method !== 'POST' || req.headers.origin !== origin ||
      req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') {
    return respond(403, 'Request denied.');
  }
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString('utf8');
      if (Buffer.byteLength(body) > 4096) return respond(413, 'Request too large.');
    }
    const fields = new URLSearchParams(body);
    if (fields.get('nonce') !== nonce) return respond(403, 'Request denied.');
    const key = fields.get('accessKeyId'), secret = fields.get('secretAccessKey');
    if (!/^[a-f0-9]{32}$/i.test(key || '') || !/^[a-f0-9]{64}$/i.test(secret || '')) {
      return respond(400, 'The two S3 credential fields are required. Nothing was saved.');
    }
    used = true;
    await writeFile(destination, `R2_ACCOUNT_ID=${account}\nR2_ACCESS_KEY_ID=${key}\nR2_SECRET_ACCESS_KEY=${secret}\nR2_BUCKET=${bucket}\n`, {flag:'wx', mode:0o600});
    respond(200, '<h1>Credential saved privately on this PC.</h1><p>The one-use setup service has closed. You may close this tab.</p>');
    console.log('R2 credential saved. No credential values were logged.');
    clearTimeout(expiry);
    server.close();
  } catch {
    respond(500, 'Nothing was replaced. Check the private credential file and directory permissions.');
    server.close();
    clearTimeout(expiry);
  }
});
const expiry = setTimeout(() => server.close(), 15 * 60 * 1000);
server.listen(Number(process.env.SETUP_PORT || 0), '127.0.0.1', () => {
  console.log(`Open http://127.0.0.1:${server.address().port}${route}`);
});
