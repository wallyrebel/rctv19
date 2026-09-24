import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { localBroadcastDirectory } from '../lib/local-paths.mjs';
const {RCTV_INGEST_DOMAIN:INGEST_DOMAIN,RCTV_PUBLISH_USER:PUBLISH_USER='vmix',RCTV_PUBLISH_PASSWORD:PUBLISH_PASSWORD}=process.env;
if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(INGEST_DOMAIN||'')) throw new Error('Set an actual ingest subdomain');
if (!/^[a-zA-Z0-9_-]{1,40}$/.test(PUBLISH_USER) || (PUBLISH_PASSWORD||'').length<32) throw new Error('Use a valid username and a random password of at least 32 characters');
const dir=path.join(localBroadcastDirectory(),'server');
await mkdir(dir,{recursive:true,mode:0o700});
await writeFile(path.join(dir,'mediamtx.json'),JSON.stringify({
 logLevel:'warn',rtsp:false,webrtc:false,srt:false,moq:false,api:false,metrics:false,playback:false,
 rtmp:true,rtmpAddress:':1935',hls:true,hlsAddress:':8888',hlsAllowOrigins:['*'],
 hlsAlwaysRemux:true,hlsVariant:'mpegts',hlsSegmentDuration:'6s',hlsSegmentCount:12,hlsDirectory:'/hls',
 authInternalUsers:[{user:PUBLISH_USER,pass:PUBLISH_PASSWORD,permissions:[{action:'publish',path:'rctv19'}]},
 {user:'any',ips:['127.0.0.1'],permissions:[{action:'read',path:'rctv19'}]}],
 paths:{rctv19:{source:'publisher',overridePublisher:false}}
},null,2),{mode:0o600,flag:'wx'});
await writeFile(path.join(dir,'traefik.json'),JSON.stringify({tcp:{
 routers:{ingest:{entryPoints:['rtmps'],rule:`HostSNI(\`${INGEST_DOMAIN}\`)`,service:'mediamtx',tls:{certResolver:'le'}}},
 services:{mediamtx:{loadBalancer:{servers:[{address:'ingest:1935'}]}}}
}},null,2),{mode:0o600,flag:'wx'});
console.log('Wrote private RCTV 19 server configuration outside the repository. No credentials printed.');
