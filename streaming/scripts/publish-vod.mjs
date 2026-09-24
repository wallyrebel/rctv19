import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { localBroadcastDirectory } from '../lib/local-paths.mjs';
import { inspectBif } from '../lib/bif.mjs';
import { readReplayConfig } from '../lib/replay-config.mjs';

// Run again to resume. Published versions are immutable: an existing different
// object is an error, never an overwrite. Only complete programs enter the feed.
const root = localBroadcastDirectory();
const preparedRoot = path.resolve(process.env.VOD_PREPARED_DIRECTORY || path.join(root, 'vod'));
const version = process.env.VOD_VERSION || 'v1';
assert.match(version, /^v[1-9][0-9]*$/);
const trickplayOnly = process.argv.includes('--trickplay-only');
const ids = process.argv.slice(2).filter(arg => arg !== '--trickplay-only');
assert.ok(ids.length, 'Supply one or more prepared program IDs');
for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
let client;
try {
  const config = await readReplayConfig(path.join(root, 'vod.env'));
  client = new S3Client({region: 'auto', endpoint: config.endpoint,
    credentials: config.credentials, maxAttempts: 5});
  for (const id of ids) {
    const directory = path.join(preparedRoot, id);
    const metadata = JSON.parse(await readFile(path.join(directory, 'metadata.json'), 'utf8'));
    assert.equal(metadata.id, id);
    const master = await readFile(path.join(directory, 'index.m3u8'), 'utf8');
    const playlist = await readFile(path.join(directory, 'main.m3u8'), 'utf8');
    assert.ok(playlist.includes('#EXT-X-ENDLIST'));
    assert.deepEqual(master.split(/\r?\n/).filter(x => x && !x.startsWith('#')), ['main.m3u8']);
    const segments = playlist.split(/\r?\n/).filter(x => x && !x.startsWith('#'));
    for (const segment of segments) assert.match(segment, /^segment-\d+\.ts$/);
    assert.equal(segments.length, metadata.segmentCount);
    assert.equal(new Set(segments).size, segments.length);
    const localNames = new Set(await readdir(directory));
    for (const quality of ['hd','sd']) {
      const preview = inspectBif(await readFile(path.join(directory,`trickplay-${quality}.bif`)));
      assert.ok(Math.abs(preview.count * preview.intervalMs / 1000 - metadata.durationSeconds) < 30);
    }
    for (const name of segments) assert.ok(localNames.has(name), `Missing ${name}`);
    const prefix = `programs/${id}/${version}`;
    if (trickplayOnly) {
      const previous = JSON.parse(await readFile(path.join(directory,'published.json'),'utf8'));
      assert.equal(previous.url, `https://vod.rctv19.com/${prefix}/index.m3u8`, 'Preview update must match the published version');
    }
    let completed = 0, uploaded = 0, reused = 0;
    async function publish(name) {
      const Body = await readFile(path.join(directory, name));
      const sha256 = createHash('sha256').update(Body).digest('hex');
      const Key = `${prefix}/${name}`, Bucket = config.bucket;
      try {
        const existing = await client.send(new HeadObjectCommand({Bucket, Key}), {abortSignal: AbortSignal.timeout(30000)});
        assert.equal(existing.ContentLength, Body.length, `Immutable object size mismatch: ${name}`);
        assert.equal(existing.Metadata?.sha256, sha256, `Immutable object checksum mismatch: ${name}`);
        reused++;
        return;
      } catch (error) {
        if (error.$metadata?.httpStatusCode !== 404 && error.name !== 'NotFound') throw error;
      }
      const ContentType = name.endsWith('.ts') ? 'video/mp2t' : name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.bif') ? 'application/octet-stream' : 'application/vnd.apple.mpegurl';
      await client.send(new PutObjectCommand({Bucket, Key, Body, ContentType,
        CacheControl: 'public, max-age=31536000, immutable', Metadata: {sha256}, IfNoneMatch: '*',
      }), {abortSignal: AbortSignal.timeout(120000)});
      uploaded++;
    }
    console.log(`Publishing ${metadata.title}: ${segments.length} segments.`);
    let next = 0;
    // Keep live publishing responsive while uploading the replay library.
    async function worker() {
      while (next < segments.length) {
        const name = segments[next++];
        await publish(name);
        completed++;
        if (completed % 50 === 0 || completed === segments.length) console.log(`${id}: ${completed}/${segments.length}`);
      }
    }
    const results = trickplayOnly ? [] : await Promise.allSettled([worker(), worker()]);
    for (const result of results) if (result.status === 'rejected') throw result.reason;
    await publish('trickplay-hd.bif');
    await publish('trickplay-sd.bif');
    if (!trickplayOnly) {
    await publish('thumbnail.jpg');
    // Playlists are advertised only after every referenced segment exists.
    await publish('main.m3u8');
    await publish('index.m3u8');
    }
    const entry = {id, title: metadata.title, description: `${metadata.title} from RCTV 19.`,
      category: metadata.category, durationSeconds: Math.round(metadata.durationSeconds), type: 'hls',
      url: `https://vod.rctv19.com/${prefix}/index.m3u8`,
      thumbnail: `https://vod.rctv19.com/${prefix}/thumbnail.jpg`,
      hdBifUrl: `https://vod.rctv19.com/${prefix}/trickplay-hd.bif`,
      sdBifUrl: `https://vod.rctv19.com/${prefix}/trickplay-sd.bif`};
    await writeFile(path.join(directory, 'published.json'), JSON.stringify(entry, null, 2) + '\n');
    console.log(`Complete: ${metadata.title}; ${uploaded} uploaded, ${reused} already verified.`);
  }
} catch (error) {
  // SDK errors can contain request details. Keep credentials out of logs.
  console.error(`Replay publishing stopped (${error.name || 'Error'}). Re-run to resume; the catalog was not changed.`);
  process.exitCode = 1;
} finally { client?.destroy(); }
