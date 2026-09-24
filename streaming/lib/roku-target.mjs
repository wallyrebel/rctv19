import net from 'node:net';
import { localBroadcastDirectory } from './local-paths.mjs';

// Never reuse an old television IP or signing identity implicitly.
export function explicitRokuTarget(host) {
  if (!process.env.RCTV_BROADCAST_DIRECTORY) throw new Error('Set the explicit private RCTV_BROADCAST_DIRECTORY before using Roku signing tools.');
  const runtime = localBroadcastDirectory();
  const octets = (host || '').split('.').map(Number);
  if (net.isIP(host || '') !== 4 || !(octets[0] === 10 || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31))) {
    throw new Error('Supply the currently verified private IPv4 address of the intended Roku TV.');
  }
  return {host, runtime};
}
