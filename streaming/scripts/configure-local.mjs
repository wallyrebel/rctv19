import { mkdir, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { localBroadcastDirectory } from '../lib/local-paths.mjs';
const dir=localBroadcastDirectory();
const config=path.join(dir,'mediamtx.json');
try {await access(config);throw new Error('Local configuration already exists; keep the existing stream key.');}
catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(dir,{recursive:true,mode:0o700});
const password=randomBytes(24).toString('hex');
await writeFile(config,JSON.stringify({
 logLevel:'warn',rtsp:false,webrtc:false,srt:false,moq:false,api:false,metrics:false,playback:false,
 rtmp:true,rtmpAddress:'127.0.0.1:19360',hls:true,hlsAddress:'127.0.0.1:18898',
 hlsAlwaysRemux:true,hlsVariant:'mpegts',hlsSegmentDuration:'6s',hlsSegmentCount:12,
 hlsDirectory:path.join(dir,'live-hls').replaceAll('\\','/'),
 authInternalUsers:[{user:'vmix',pass:password,ips:['127.0.0.1'],permissions:[{action:'publish',path:'rctv19'}]},
 {user:'any',ips:['127.0.0.1'],permissions:[{action:'read',path:'rctv19'}]}],
 paths:{rctv19:{source:'publisher',overridePublisher:false}}
},null,2),{mode:0o600,flag:'wx'});
await writeFile(path.join(dir,'vmix-settings.txt'),[
 'Private local encoder settings. Do not upload to Git or share screenshots of this file.',
 'Server: rtmp://127.0.0.1:19360/',
 `Stream key: rctv19?user=vmix&pass=${password}`,
 'Only this computer can connect. Nothing needs to be port-forwarded.',
 'Use H.264 video, AAC audio, 2-second keyframes. Start with 720p60 around 4.5–5 Mbps total.',
 'This is a local ingest address, not a viewer URL.',
].join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log('Created private loopback-only receiver configuration and vmix-settings.txt. No credentials printed.');
