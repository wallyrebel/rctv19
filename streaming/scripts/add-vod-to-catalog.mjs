import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { localBroadcastDirectory } from '../lib/local-paths.mjs';
import { validateCatalog } from '../lib/catalog.mjs';
import { inspectBif } from '../lib/bif.mjs';

const directory = path.resolve(process.env.VOD_PREPARED_DIRECTORY || path.join(localBroadcastDirectory(), 'vod'));
const ids = process.argv.slice(2);
assert.ok(ids.length);
const catalogPath = process.env.CATALOG_PATH || new URL('../catalog/rctv19.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
assert.equal(catalog.channel?.id, 'rctv19', 'Only the RCTV 19 catalog can be changed by this publisher');
const programs = new Map(catalog.videos.map(item => [item.id, item]));
async function get(url) {
  const response = await fetch(url, {headers:{Origin:'https://watch.rctv19.com'},signal:AbortSignal.timeout(30000)});
  assert.ok(response.ok, `Public replay unavailable: ${response.status}`);
  assert.equal(response.headers.get('access-control-allow-origin'), '*', 'Replay needs browser CORS');
  return response;
}
for (const id of ids) {
  assert.match(id, /^[a-z0-9-]+$/);
  const entry = JSON.parse(await readFile(path.join(directory,id,'published.json'),'utf8'));
  assert.equal(entry.id,id);
  for (const field of ['url', 'thumbnail', 'hdBifUrl', 'sdBifUrl']) assert.equal(new URL(entry[field]).origin,'https://vod.rctv19.com');
  const master = await (await get(entry.url)).text();
  const variant = master.split(/\r?\n/).find(x => x && !x.startsWith('#'));
  assert.equal(variant,'main.m3u8');
  const playlistURL = new URL(variant,entry.url);
  const playlist = await (await get(playlistURL)).text();
  assert.ok(playlist.includes('#EXT-X-ENDLIST'));
  const segments = playlist.split(/\r?\n/).filter(x => x && !x.startsWith('#'));
  for (const segment of segments) assert.match(segment,/^segment-\d+\.ts$/);
  for (const segment of [segments[0],segments.at(-1)]) {
    const response = await get(new URL(segment,playlistURL));
    assert.ok((await response.arrayBuffer()).byteLength>0);
  }
  await (await get(entry.thumbnail)).arrayBuffer();
  for (const url of [entry.hdBifUrl, entry.sdBifUrl]) {
    const preview = inspectBif(Buffer.from(await (await get(url)).arrayBuffer()));
    assert.ok(Math.abs(preview.count * preview.intervalMs / 1000 - entry.durationSeconds) < 30);
  }
  programs.set(id,entry);
  console.log(`Verified public HLS, first/last segments, thumbnail and CORS: ${entry.title}`);
}
catalog.videos = [...programs.values()].sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}));
assert.deepEqual(validateCatalog(catalog),[]);
const temporary = process.env.CATALOG_PATH ? `${catalogPath}.tmp` : new URL('../catalog/rctv19.json.tmp',import.meta.url);
await writeFile(temporary,JSON.stringify(catalog,null,2)+'\n');
await rename(temporary,catalogPath);
console.log('Local catalog updated. Build and deploy the website to publish this catalog.');
