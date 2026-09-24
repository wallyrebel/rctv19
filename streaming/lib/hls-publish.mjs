import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function resolveReference(parent, uri) {
  const decoded = decodeURIComponent(uri);
  if (!decoded || /[\\?#:\x00-\x1f]/.test(decoded) || decoded.startsWith('/') || decoded.split('/').includes('..')) throw new Error('Unsafe HLS reference');
  return path.posix.join(path.posix.dirname(parent), decoded);
}

// Snapshot all dependencies before any write. Playlists are committed only after
// every object they refer to has successfully reached object storage.
export async function snapshotHls(directory, entry = 'index.m3u8') {
  const root = await realpath(directory);
  const files = new Map();
  const pending = new Set();
  async function visit(relative) {
    if (pending.has(relative)) throw new Error('Cyclic HLS playlist');
    if (files.has(relative)) return;
    if (!/\.(m3u8|ts|mp4|m4s|aac)$/.test(relative)) throw new Error('Unsupported HLS file');
    const absolute = await realpath(path.join(root, relative));
    const inside = path.relative(root, absolute);
    if (inside.startsWith('..') || path.isAbsolute(inside)) throw new Error('HLS file escapes media directory');
    if ((await stat(absolute)).size > 64 * 1024 * 1024) throw new Error('HLS object exceeds 64 MiB safety limit');
    const body = await readFile(absolute);
    pending.add(relative);
    const playlist = relative.endsWith('.m3u8');
    if (playlist) {
      const text = body.toString('utf8');
      if (!text.startsWith('#EXTM3U')) throw new Error('Invalid HLS playlist');
      if (/#EXT-X-(?:PART|PRELOAD-HINT|KEY):/.test(text)) throw new Error('Use ordinary unencrypted HLS for this publisher');
      for (const line of text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)) {
        if (!line.startsWith('#')) await visit(resolveReference(relative,line));
        else for (const match of line.matchAll(/URI="([^"]+)"/g)) await visit(resolveReference(relative,match[1]));
      }
    }
    pending.delete(relative);
    files.set(relative, { body, hash:digest(body), playlist });
  }
  await visit(resolveReference('root.m3u8',entry));
  return files;
}

export async function publishHls(snapshot, put, known = new Map(), { now = Date.now() } = {}) {
  for (const [key,item] of snapshot) {
    const old = known.get(key);
    const renewalDue = item.playlist && item.refreshAfterMs && old && now - old.uploadedAt >= item.refreshAfterMs;
    if (old?.hash === item.hash && !renewalDue) { old.seen = now; continue; }
    if (old && !item.playlist) throw new Error('Media filename reused with different bytes; restart with unique segment names');
    const ext = path.posix.extname(key);
    await put(key,item.body,{
      contentType: { '.m3u8':'application/vnd.apple.mpegurl','.ts':'video/mp2t','.mp4':'video/mp4','.m4s':'video/mp4','.aac':'audio/aac' }[ext],
      cacheControl: item.playlist ? 'public, max-age=1, s-maxage=2, must-revalidate' : 'public, max-age=86400, immutable',
    });
    known.set(key,{hash:item.hash,seen:now,uploadedAt:now,...(item.playlist ? {body:item.body} : {})});
  }
  // Keep a bounded in-memory index. R2 lifecycle rules handle remote retention.
  for (const [key,item] of known) if (now-item.seen > 3600000) known.delete(key);
  return known;
}
