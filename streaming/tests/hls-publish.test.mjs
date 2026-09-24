import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { snapshotHls,publishHls } from '../lib/hls-publish.mjs';

test('a failed segment upload never publishes a playlist referring to it',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sports-hls-'));
 try {
  await writeFile(path.join(dir,'index.m3u8'),'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nstream.m3u8\n');
  await writeFile(path.join(dir,'stream.m3u8'),'#EXTM3U\n#EXTINF:6,\nsegment1.ts\n#EXTINF:6,\nsegment2.ts\n');
  await writeFile(path.join(dir,'segment1.ts'),'first'); await writeFile(path.join(dir,'segment2.ts'),'second');
  const graph=await snapshotHls(dir), writes=[], known=new Map();
  await assert.rejects(publishHls(graph,async(key)=>{if(key==='segment2.ts') throw new Error('network down'); writes.push(key);},known));
  assert.deepEqual(writes,['segment1.ts']);
  await publishHls(graph,async(key)=>writes.push(key),known);
  assert.deepEqual(writes,['segment1.ts','segment2.ts','stream.m3u8','index.m3u8']);
  await publishHls(graph,async()=>assert.fail('unchanged objects should not be re-uploaded'),known);
  await writeFile(path.join(dir,'segment1.ts'),'changed');
  await assert.rejects(publishHls(await snapshotHls(dir),async()=>{},known),/filename reused/);
 } finally {await rm(dir,{recursive:true,force:true});}
});
test('rejects missing dependencies and encoded traversal before uploading',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sports-hls-'));
 try {
  await writeFile(path.join(dir,'index.m3u8'),'#EXTM3U\nmissing.ts\n');
  await assert.rejects(snapshotHls(dir),/ENOENT/);
  await writeFile(path.join(dir,'index.m3u8'),'#EXTM3U\n%2e%2e/private.ts\n');
  await assert.rejects(snapshotHls(dir),/Unsafe/);
 } finally {await rm(dir,{recursive:true,force:true});}
});
