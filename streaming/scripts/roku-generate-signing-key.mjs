import net from 'node:net';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { explicitRokuTarget } from '../lib/roku-target.mjs';

// First-time generation only, after checking the TV says "no dev key".
// The raw firmware response stays in the private profile, never in Git or logs.
const {host, runtime} = explicitRokuTarget(process.argv[2]);
if (!process.argv.includes('--confirmed-no-dev-key')) throw new Error('Inspect the target TV first. Only pass --confirmed-no-dev-key if it has no existing signing key.');
const file = await open(path.join(runtime, 'roku-signing-key.txt'), 'wx', 0o600);
let response = '', sent = false, finished = false;
const socket = net.createConnection({host, port: 8080});
const timeout = setTimeout(() => finish(false), 60000);
async function finish(success) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  socket.destroy();
  await file.writeFile(response);
  await file.close();
  console.log(success ? 'Roku signing credentials saved privately; retain this file for future updates.' : 'Signing setup did not confirm completion; private response preserved for diagnosis. Do not regenerate blindly.');
  if (!success) process.exitCode = 1;
}
socket.on('data', chunk => {
  response += chunk.toString('utf8');
  if (!sent) { sent = true; socket.write('genkey\r\n'); }
  if (/password\s*:/i.test(response) && /(?:dev\s*id|developer\s*id)\s*:/i.test(response)) finish(true);
});
socket.on('error', () => finish(false));
socket.on('end', () => finish(/password\s*:/i.test(response)));
