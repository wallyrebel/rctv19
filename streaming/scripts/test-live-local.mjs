import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { snapshotHls,publishHls } from '../lib/hls-publish.mjs';

if (!process.env.FFMPEG_PATH) throw new Error('Set FFMPEG_PATH to the installed official FFmpeg binary');
const dir=path.resolve('.cache/live-smoke'); await mkdir(dir,{recursive:true});
const hls=path.join(dir,`hls-${Date.now()}`).replaceAll('\\','/');
const config=path.join(dir,'mediamtx.json');
await writeFile(config,JSON.stringify({
 logLevel:'warn',rtsp:false,webrtc:false,srt:false,moq:false,
 rtmp:true,rtmpAddress:'127.0.0.1:19360',hls:true,hlsAddress:'127.0.0.1:18898',
 hlsAlwaysRemux:true,hlsVariant:'mpegts',hlsSegmentDuration:'2s',hlsSegmentCount:7,hlsDirectory:hls,
 authInternalUsers:[{user:'localtest',pass:'local-only',ips:['127.0.0.1'],permissions:[{action:'publish',path:'rctv19'}]},
 {user:'any',ips:['127.0.0.1'],permissions:[{action:'read',path:'rctv19'}]}],paths:{rctv19:{source:'publisher',overridePublisher:false}}
}));
let encoder, mediaLog='',encoderLog='';
const server=spawn(path.resolve('.cache/mediamtx/mediamtx.exe'),[config],{windowsHide:true,stdio:['ignore','ignore','pipe']});
server.stderr.on('data',b=>{mediaLog+=b;});
try {
 await delay(700);
 if (server.exitCode!==null) throw new Error(`Media server exited: ${mediaLog}`);
 encoder=spawn(process.env.FFMPEG_PATH,['-hide_banner','-loglevel','error','-re','-f','lavfi','-i','testsrc2=size=640x360:rate=30','-f','lavfi','-i','sine=frequency=1000:sample_rate=48000','-t','22','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-g','60','-keyint_min','60','-sc_threshold','0','-b:v','1000k','-c:a','aac','-b:a','96k','-f','flv','rtmp://127.0.0.1:19360/rctv19?user=localtest&pass=local-only'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 encoder.stderr.on('data',b=>{encoderLog+=b;});
 let graph;
 for(let i=0;i<35;i++) {
  await delay(500);
  try {graph=await snapshotHls(path.join(hls,'rctv19'));if([...graph.keys()].some(k=>k.endsWith('.ts')))break;}catch{}
 }
 if(!graph) throw new Error(`No HLS produced. ${mediaLog} ${encoderLog}`);
 const response=await fetch('http://127.0.0.1:18898/rctv19/index.m3u8');
 if(!response.ok || !(await response.text()).startsWith('#EXTM3U')) throw new Error('HLS HTTP read failed');
 const uploadOrder=[];
 await publishHls(graph,async(key,body)=>{if(!body.length)throw new Error('Empty object');uploadOrder.push(key);});
 const result={testedAt:new Date().toISOString(),passed:true,transport:'local RTMP → MediaMTX → MPEG-TS HLS',files:uploadOrder,notes:'Synthetic video. R2 upload simulated; public TLS, CDN and TV devices remain untested.'};
 await writeFile(path.join(dir,'result.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
} finally {encoder?.kill();server.kill();}
