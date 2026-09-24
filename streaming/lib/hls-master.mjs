import { createHash } from 'node:crypto';

export const MASTER_STATS_INTERVAL_MS = 60_000;
export const MASTER_KEEPALIVE_MS = 6 * 60 * 60 * 1000;

// Restrict this optimization to the current single, muxed live rendition.
// Unknown formats and future adaptive/alternate renditions pass through intact.
function describe(text) {
  const lines = text.trim().split(/\r?\n/);
  const variants = lines.filter(line => line.startsWith('#EXT-X-STREAM-INF:'));
  if (lines[0] !== '#EXTM3U' || variants.length !== 1 ||
      lines.filter(line => line && !line.startsWith('#')).length !== 1 ||
      lines.some(line => /^#EXT(?:INF:|-X-(?:MEDIA:|I-FRAME-STREAM-INF:|SESSION-KEY:))/.test(line))) return null;
  const tag = variants[0], value = tag.slice('#EXT-X-STREAM-INF:'.length);
  const fields = value.match(/[A-Z0-9-]+=(?:"[^"\r\n]*"|[^,"\r\n]+)/g);
  if (!fields || fields.join(',') !== value) return null;
  const attributes = new Map();
  for (const field of fields) {
    const at = field.indexOf('='), name = field.slice(0, at);
    if (attributes.has(name)) return null;
    attributes.set(name, field.slice(at + 1));
  }
  const bandwidth = attributes.get('BANDWIDTH'), average = attributes.get('AVERAGE-BANDWIDTH');
  if (![bandwidth, average].every(n => /^[1-9]\d*$/.test(n || '') && Number.isSafeInteger(Number(n)))) return null;
  if (Number(average) > Number(bandwidth)) return null;
  const identity = lines.map(line => line === tag ? '#EXT-X-STREAM-INF:' +
    fields.filter(field => !/^(?:AVERAGE-)?BANDWIDTH=/.test(field)).join(',') : line).join('\n');
  return { identity, bandwidth: Number(bandwidth), average: Number(average) };
}

export function stabilizeMasterPlaylist(raw, previous, now, publishedAt) {
  if (!previous || !Number.isFinite(publishedAt) || now < publishedAt) return raw;
  const current = describe(raw), old = describe(previous);
  if (!current || !old || current.identity !== old.identity) return raw;
  // Retain Apple's required average field. Bypass the interval well before its
  // live tolerances (peak <125%, hour-average <110%) could be exceeded.
  if (current.bandwidth > old.bandwidth * 1.10 || current.average > old.average * 1.05) return raw;
  return now - publishedAt >= MASTER_STATS_INTERVAL_MS ? raw : previous;
}

export function prepareLiveMasters(snapshot, known, now = Date.now()) {
  for (const [key, item] of snapshot) {
    if (!item.playlist || !item.body.includes('#EXT-X-STREAM-INF:')) continue;
    const old = known.get(key);
    const text = stabilizeMasterPlaylist(item.body.toString('utf8'), old?.body?.toString('utf8'), now, old?.uploadedAt);
    item.body = Buffer.from(text);
    item.hash = createHash('sha256').update(item.body).digest('hex');
    // The live bucket expires objects by last-modified time. Even a completely
    // steady stream must renew its master well inside that one-day deadline.
    item.refreshAfterMs = MASTER_KEEPALIVE_MS;
  }
}
