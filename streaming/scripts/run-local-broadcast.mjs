import { spawn } from 'node:child_process';
import { access, mkdir, open, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { r2CredentialFile, localBroadcastDirectory } from '../lib/local-paths.mjs';
import { readLiveConfig } from '../lib/live-config.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mediaBinary=process.env.MEDIAMTX_PATH || path.join(root,'.cache/mediamtx/mediamtx.exe');
const runtime=localBroadcastDirectory();
const config=path.join(runtime,'mediamtx.json');
const secrets=r2CredentialFile();
for(const file of [mediaBinary,config,secrets]) await access(file);
const liveCredentials = await readLiveConfig(secrets);
const receiver = JSON.parse(await readFile(config, 'utf8'));
if (receiver.rtmpAddress !== '127.0.0.1:19360' || receiver.hlsAddress !== '127.0.0.1:18898'
  || path.resolve(receiver.hlsDirectory) !== path.join(runtime, 'live-hls')
  || Object.keys(receiver.paths || {}).join(',') !== 'rctv19') {
  throw new Error('Receiver configuration does not match this RCTV 19 installation.');
}
await mkdir(path.join(runtime,'live-hls'),{recursive:true});
const log=await open(path.join(runtime,'broadcast.log'),'a');
const healthFile=path.join(runtime,'live-health.json');
// A loopback status port also prevents two helpers fighting for the same feed.
const status=http.createServer(async(_req,res)=>{
 let published;
 try {published=JSON.parse(await readFile(healthFile,'utf8')).lastPublishedAt;} catch {}
 const live=published && Date.now()-Date.parse(published)<30000;
 res.writeHead(live?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify({helperRunning:true,publishing:!!live,lastPublishedAt:published || null}));
});
await new Promise((resolve,reject)=>{
 status.once('error',reject);status.listen(19361,'127.0.0.1',resolve);
}).catch(error=>{
 if(error.code==='EADDRINUSE'){console.log('A broadcast helper already owns the local status port; no second copy started.');process.exit(0);}
 throw error;
});
let stopping=false;
const children=new Set(),timers=new Set();
function supervise(name,executable,args,env) {
 if(stopping)return;
 const child=spawn(executable,args,{cwd:root,windowsHide:true,env:{...process.env,...env},stdio:['ignore',log.fd,log.fd]});
 children.add(child);
 child.on('error',()=>console.error(`${name} could not start. Check installed runtime and file permissions.`));
 child.on('close',()=>{
  children.delete(child);
  if(!stopping){console.error(`${name} stopped; restarting in five seconds.`);const timer=setTimeout(()=>{timers.delete(timer);supervise(name,executable,args,env);},5000);timers.add(timer);}
 });
}
supervise('Local RTMP receiver',mediaBinary,[config],{});
supervise('Cloudflare uploader',process.execPath,[path.join(root,'scripts/publish-live.mjs'),`--runtime=${runtime}`],{
 ...liveCredentials, RCTV_BROADCAST_DIRECTORY:runtime,
 HLS_DIRECTORY:path.join(runtime,'live-hls/rctv19'),HLS_ENTRY:'index.m3u8',
 R2_BUCKET:'rctv19-live',R2_PREFIX:'rctv19',HEALTH_FILE:healthFile,
});
console.log('Local receiver and uploader started. Waiting for the vMix/OBS RCTV 19 program.');
function stop(){stopping=true;status.close();for(const timer of timers)clearTimeout(timer);for(const child of children)child.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
