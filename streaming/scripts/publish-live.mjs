import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { snapshotHls, publishHls } from '../lib/hls-publish.mjs';
import { continueMediaPlaylist } from '../lib/hls-continuity.mjs';
import { prepareLiveMasters, MASTER_STATS_INTERVAL_MS } from '../lib/hls-master.mjs';
import { validateLiveConfig } from '../lib/live-config.mjs';

for (const name of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET','HLS_DIRECTORY']) if (!process.env[name]) throw new Error(`Missing ${name}`);
if (!/^[a-f0-9]{32}$/.test(process.env.R2_ACCOUNT_ID)) throw new Error('Invalid Cloudflare account ID');
validateLiveConfig(process.env);
const prefix = process.env.R2_PREFIX || 'rctv19';
if (prefix !== 'rctv19') throw new Error('RCTV 19 live uploads require the rctv19 object prefix.');
const client = new S3Client({
  region:'auto', endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},
  maxAttempts:3,
});
const known = new Map();
const previousMedia = new Map();
const startedAt = new Date().toISOString();
const successfulObjectUploads = {segments:0,mediaPlaylists:0,masterPlaylists:0};
let stopping = false, lastChanged = Date.now(), lastSignature, wasFailing = false;
process.on('SIGINT',()=>{stopping=true;});
process.on('SIGTERM',()=>{stopping=true;});
while (!stopping) {
  try {
    const snapshot = await snapshotHls(process.env.HLS_DIRECTORY,process.env.HLS_ENTRY || 'index.m3u8');
    for(const [key,item] of snapshot) {
      if(!item.playlist || !item.body.includes('#EXTINF:')) continue;
      if(!previousMedia.has(key)) {
        let prior=null;
        try {
          const result=await client.send(new GetObjectCommand({Bucket:process.env.R2_BUCKET,Key:`${prefix}/${key}`}),{abortSignal:AbortSignal.timeout(15000)});
          if(result.ContentLength>1024*1024) throw new Error('Oversized prior playlist');
          prior=await result.Body.transformToString();
        } catch(error) {if(error.name!=='NoSuchKey' && error.$metadata?.httpStatusCode!==404) throw error;}
        previousMedia.set(key,prior);
      }
      const normalized=continueMediaPlaylist(item.body.toString('utf8'),previousMedia.get(key));
      // Reserve this mapping before upload so a retry cannot assign the same
      // public sequence number to a different segment after an uncertain PUT.
      previousMedia.set(key,normalized);
      item.body=Buffer.from(normalized);
      item.hash=createHash('sha256').update(item.body).digest('hex');
    }
    prepareLiveMasters(snapshot,known);
    await publishHls(snapshot,async (key,Body,metadata)=>{
      await client.send(new PutObjectCommand({Bucket:process.env.R2_BUCKET,Key:`${prefix}/${key}`,Body,ContentType:metadata.contentType,CacheControl:metadata.cacheControl}),{abortSignal:AbortSignal.timeout(30000)});
      const kind = key.endsWith('.m3u8') ? (Body.includes('#EXT-X-STREAM-INF:') ? 'masterPlaylists' : 'mediaPlaylists') : 'segments';
      successfulObjectUploads[kind]++;
    },known);
    const signature = [...snapshot.values()].filter(x=>x.playlist).map(x=>x.hash).join(':');
    if (signature !== lastSignature) {
      lastSignature = signature; lastChanged = Date.now();
      if (process.env.HEALTH_FILE) await writeFile(process.env.HEALTH_FILE,JSON.stringify({
        lastPublishedAt:new Date(lastChanged).toISOString(),publisherVersion:'master-refresh-1',startedAt,
        masterStatsIntervalSeconds:MASTER_STATS_INTERVAL_MS/1000,successfulObjectUploads,
      }));
      if (wasFailing) console.log('Live publishing recovered.');
      wasFailing = false;
    }
  } catch (error) {
    // Do not log SDK request details, keys or credentials.
    if (!wasFailing) console.error(`Live publish unavailable (${error.name || 'Error'}); retaining the last complete playlist and retrying.`);
    wasFailing = true;
  }
  if (Date.now()-lastChanged > 120000) {
    console.error('No fresh live playlist published for two minutes. Check vMix, connectivity and R2; exiting for supervisor restart.');
    process.exitCode=1; break;
  }
  await delay(750);
}
client.destroy();
