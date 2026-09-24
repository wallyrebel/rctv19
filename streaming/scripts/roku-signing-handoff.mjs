import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { explicitRokuTarget } from '../lib/roku-target.mjs';

// Short-lived, loopback-only handoff into the already authenticated Roku
// packager. The signing password is never printed or placed in a URL.
const {host, runtime} = explicitRokuTarget(process.argv[2]);
// A developer identity can sign more than one app. Allow an explicitly chosen
// existing private key file without copying it into another runtime directory.
const signingFile = process.env.RCTV_ROKU_SIGNING_KEY_FILE || path.join(runtime, 'roku-signing-key.txt');
if (!path.isAbsolute(signingFile) || signingFile.split(/[\\/]/).some(part => /^onedrive(?:\s|-|$)/i.test(part))) {
  throw new Error('Use an absolute signing-key path outside OneDrive.');
}
const raw = await readFile(signingFile, 'utf8');
const password = raw.match(/password\s*:\s*(\S+)/i)?.[1];
if (!password) throw new Error('Signing password not found in private firmware response');
const route = `/signing/${randomBytes(24).toString('hex')}`;
const escaped = password.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const server = http.createServer((req,res) => {
  if(req.url !== route || req.headers.host !== `127.0.0.1:${server.address().port}` || req.method !== 'GET') {res.writeHead(404);res.end();return;}
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"});
  res.end(`<!doctype html><title>Roku signing handoff</title><h1>RCTV 19 signing credential</h1><p>Private local handoff for the verified Roku TV packager at ${host}.</p><p>Signing password: <code id="signing-password">${escaped}</code></p>`);
});
const expiry = setTimeout(()=>server.close(),5*60*1000);
server.on('close',()=>clearTimeout(expiry));
server.listen(0,'127.0.0.1',()=>console.log(`Open http://127.0.0.1:${server.address().port}${route}`));
