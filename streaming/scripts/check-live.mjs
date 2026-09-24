import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const address=process.argv[2];
if (!address || new URL(address).protocol!=='https:') throw new Error('Supply the public HTTPS HLS master URL.');
const origin='https://watch.rctv19.com';
async function get(url) {
 const response=await fetch(url,{headers:{Origin:origin},signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200,`HTTP status for ${new URL(url).pathname}`);
 assert.equal(response.headers.get('access-control-allow-origin'),'*','Public video must allow website playback');
 return response;
}
const master=await get(address), masterText=await master.text();
assert.match(masterText,/^#EXTM3U/);
const variantReference=masterText.split(/\r?\n/).find(line=>line && !line.startsWith('#'));
const variantUrl=new URL(variantReference,address);
assert.equal(variantUrl.origin,new URL(address).origin);
const variant=await get(variantUrl), initial=await variant.text();
assert.match(variant.headers.get('cache-control'),/s-maxage=2/);
const sequence=text=>Number(text.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)?.[1]);
const references=initial.split(/\r?\n/).filter(line=>line && !line.startsWith('#'));
assert.ok(references.length>0,'Live playlist needs segments');
const segmentUrl=new URL(references.at(-1),variantUrl);
assert.equal(segmentUrl.origin,variantUrl.origin);
const segment=await get(segmentUrl), bytes=new Uint8Array(await segment.arrayBuffer());
assert.ok(bytes.length>188,'Segment must contain video data');
assert.equal(bytes[0],0x47,'MPEG-TS sync byte');
assert.match(segment.headers.get('cache-control'),/immutable/);
const cached=await get(segmentUrl); await cached.arrayBuffer();
assert.equal(cached.headers.get('cf-cache-status'),'HIT','Second segment fetch should hit edge cache');
await delay(9000);
const next=await get(variantUrl), updated=await next.text();
assert.ok(sequence(updated)>sequence(initial),'Public live playlist must advance');
console.log(JSON.stringify({
 url:address,https:true,cors:'*',segmentBytes:bytes.length,
 segmentCache:cached.headers.get('cf-cache-status'),
 playlistCacheControl:next.headers.get('cache-control'),
 sequenceBefore:sequence(initial),sequenceAfter:sequence(updated),
 checkedAt:new Date().toISOString(),
},null,2));
