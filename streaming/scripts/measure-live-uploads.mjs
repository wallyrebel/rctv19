// Read-only comparison: runs the publishing decisions against a no-op upload.
// Does not load credentials, contact R2, or modify receiver/broadcast files.
import { setTimeout as delay } from 'node:timers/promises';
import { snapshotHls, publishHls } from '../lib/hls-publish.mjs';
import { prepareLiveMasters } from '../lib/hls-master.mjs';

const [directory, duration='180'] = process.argv.slice(2);
const seconds = Number(duration);
if (!directory || !Number.isFinite(seconds) || seconds < 60 || seconds > 3600) throw new Error('Usage: node scripts/measure-live-uploads.mjs HLS_DIRECTORY SECONDS (60–3600)');
const baseline = new Map(), optimized = new Map();
const totals = () => ({segments:0,mediaPlaylists:0,masterPlaylists:0});
const before = totals(), after = totals();
let warming = true, failures = 0, start = Date.now(), lastReport = start;
const count = counts => async(key,body) => {
  if(warming) return;
  counts[key.endsWith('.m3u8') ? (body.includes('#EXT-X-STREAM-INF:') ? 'masterPlaylists' : 'mediaPlaylists') : 'segments']++;
};
const report = final => {
  const elapsedSeconds=(Date.now()-start)/1000;
  const sum = counts => Object.values(counts).reduce((a,b)=>a+b,0);
  console.log(JSON.stringify({final,elapsedSeconds,baseline:before,optimized:after,readRetries:failures,
    projected30DayWrites:Math.round(sum(after)/elapsedSeconds*30*86400),
    projected31DayWrites:Math.round(sum(after)/elapsedSeconds*31*86400)}));
};
while(Date.now()-start < seconds*1000) {
  try {
    const snapshot=await snapshotHls(directory);
    const changed=new Map([...snapshot].map(([key,value])=>[key,{...value}]));
    const now=Date.now();
    await publishHls(snapshot,count(before),baseline,{now});
    prepareLiveMasters(changed,optimized,now);
    await publishHls(changed,count(after),optimized,{now});
    if(warming) {warming=false;start=Date.now();lastReport=start;}
  } catch(error) {
    failures++;
    if(failures>20) throw error;
  }
  if(Date.now()-lastReport>=60_000) {report(false);lastReport=Date.now();}
  await delay(750);
}
report(true);
