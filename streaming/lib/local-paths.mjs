import path from 'node:path';
import os from 'node:os';

// Use one stable profile path from packaged apps and ordinary Windows tasks.
// Do not inherit another channel's runtime or credential-file overrides.
export function localBroadcastDirectory() {
  const configured = process.env.RCTV_BROADCAST_DIRECTORY;
  const directory = configured || path.join(process.env.USERPROFILE || os.homedir(), '.rctv19-streaming');
  if (!path.isAbsolute(directory)) throw new Error('RCTV_BROADCAST_DIRECTORY must be an absolute private path.');
  const resolved = path.resolve(directory);
  if (resolved.split(/[\\/]/).some(part => /^onedrive(?:\s|-|$)/i.test(part))) {
    throw new Error('Store RCTV 19 credentials outside OneDrive.');
  }
  if (!/^\.?rctv19(?:[-_].*)?$/i.test(path.basename(resolved))) {
    throw new Error('Use a dedicated private directory whose name begins with rctv19.');
  }
  return resolved;
}

export function r2CredentialFile(purpose = 'live') {
  if (!['live', 'vod'].includes(purpose)) throw new Error('Unknown RCTV 19 credential purpose.');
  return path.join(localBroadcastDirectory(), purpose === 'vod' ? 'vod.env' : 'r2.env');
}
