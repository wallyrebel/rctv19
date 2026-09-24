import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stabilizeMasterPlaylist, prepareLiveMasters, MASTER_KEEPALIVE_MS } from '../lib/hls-master.mjs';
import { publishHls } from '../lib/hls-publish.mjs';
import { continueMediaPlaylist } from '../lib/hls-continuity.mjs';

const master = (peak=2_000_000, average=1_700_000, extra='') => `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-STREAM-INF:BANDWIDTH=${peak},AVERAGE-BANDWIDTH=${average},CODECS="avc1.42c01f,mp4a.40.2",RESOLUTION=1280x720,FRAME-RATE=29.970${extra}\nmain_stream.m3u8\n`;
const item = (body,playlist=false) => ({body:Buffer.from(body),playlist,hash:createHash('sha256').update(body).digest('hex')});

test('small live statistics changes retain both bandwidth fields and refresh at one minute',()=>{
  const old=master(), current=master(2_050_000,1_720_000);
  assert.equal(stabilizeMasterPlaylist(current,old,59_999,0),old);
  assert.equal(stabilizeMasterPlaylist(current,old,60_000,0),current);
  assert.equal(stabilizeMasterPlaylist(current,null,0,undefined),current);
  assert.equal(stabilizeMasterPlaylist(current,old,0,100),current);
});

test('format, URL, metadata and significant bitrate changes bypass the delay',()=>{
  const old=master();
  for (const current of [
    master(2_200_001),master(2_000_000,1_785_001),
    old.replace('1280x720','1920x1080'),old.replace('29.970','59.940'),
    old.replace('avc1.42c01f','avc1.640028'),old.replace('mp4a.40.2','ac-3'),
    old.replace('main_stream.m3u8','new_stream.m3u8'),master(2_000_000,1_700_000,',VIDEO-RANGE=SDR'),
    old.replace('#EXT-X-VERSION:3','#EXT-X-VERSION:6'),
  ]) assert.equal(stabilizeMasterPlaylist(current,old,1000,0),current);
});

test('unsupported or malformed masters pass through without rewriting',()=>{
  const old=master();
  for(const current of [old+master(),old.replace('AVERAGE-BANDWIDTH=1700000,',''),
    old.replace('BANDWIDTH=2000000','BANDWIDTH=0'),old.replace('BANDWIDTH=2000000','BANDWIDTH=2000000,BANDWIDTH=2100000'),
    old+'#EXT-X-MEDIA:TYPE=AUDIO,URI="audio.m3u8"\n',old.replace('CODECS="avc1.42c01f,mp4a.40.2"','CODECS="broken'),
  ]) assert.equal(stabilizeMasterPlaylist(current,old,1000,0),current);
});

test('a minute of live segments preserves all media bytes and suppresses nine master uploads',async()=>{
  const known=new Map(),writes=[];
  for(let i=0;i<=10;i++) {
    const bytes=Buffer.from(`unaltered muxed audio/video ${i}`);
    const media=`#EXTM3U\n#EXTINF:6,\nsegment${i}.ts\n`;
    const graph=new Map([[`segment${i}.ts`,item(bytes)],['main_stream.m3u8',item(media,true)],['index.m3u8',item(master(2_000_000+i*100,1_700_000+i*100),true)]]);
    prepareLiveMasters(graph,known,i*6000);
    assert.deepEqual(graph.get(`segment${i}.ts`).body,bytes);
    assert.equal(graph.get('main_stream.m3u8').body.toString(),media);
    await publishHls(graph,async(key,body)=>writes.push({key,body}),known,{now:i*6000});
  }
  assert.equal(writes.filter(x=>x.key==='index.m3u8').length,2);
  assert.equal(writes.filter(x=>x.key==='main_stream.m3u8').length,11);
  assert.equal(writes.filter(x=>x.key.endsWith('.ts')).length,11);
});

test('failed master upload stays pending and never advances its published state',async()=>{
  const known=new Map();
  const first=new Map([['index.m3u8',item(master(),true)]]);
  prepareLiveMasters(first,known,0);await publishHls(first,async()=>{},known,{now:0});
  const changed=master(4_000_000,3_000_000);
  const graph=new Map([['index.m3u8',item(changed,true)]]);
  prepareLiveMasters(graph,known,6000);
  await assert.rejects(publishHls(graph,async()=>{throw new Error('network');},known,{now:6000}));
  assert.equal(known.get('index.m3u8').body.toString(),master());
  assert.equal(known.get('index.m3u8').uploadedAt,0);
  const retry=new Map([['index.m3u8',item(changed,true)]]);
  prepareLiveMasters(retry,known,7000);
  await publishHls(retry,async()=>{},known,{now:7000});
  assert.equal(known.get('index.m3u8').body.toString(),changed);
});

test('unchanged master is renewed before one-day lifecycle expiry and failed renewal retries',async()=>{
  const known=new Map();let puts=0;
  for(const now of [0,MASTER_KEEPALIVE_MS-1,MASTER_KEEPALIVE_MS]) {
    const graph=new Map([['index.m3u8',item(master(),true)]]);
    prepareLiveMasters(graph,known,now);
    await publishHls(graph,async()=>puts++,known,{now});
  }
  assert.equal(puts,2);
  const graph=new Map([['index.m3u8',item(master(),true)]]);
  prepareLiveMasters(graph,known,2*MASTER_KEEPALIVE_MS);
  await assert.rejects(publishHls(graph,async()=>{throw new Error('network');},known,{now:2*MASTER_KEEPALIVE_MS}));
  assert.equal(known.get('index.m3u8').uploadedAt,MASTER_KEEPALIVE_MS);
  await publishHls(graph,async()=>puts++,known,{now:2*MASTER_KEEPALIVE_MS+1});
  assert.equal(puts,3);
});

test('uploader restart publishes a fresh master and source restart retains HLS continuity',async()=>{
  const raw=(source,seq)=>`#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-MEDIA-SEQUENCE:${seq}\n#EXTINF:6,\n${source}_main_seg${seq}.ts\n`;
  const old=continueMediaPlaylist(raw('old',100),null);
  const current=continueMediaPlaylist(raw('new',0),old);
  const graph=new Map([['main_stream.m3u8',item(current,true)],['index.m3u8',item(master(),true)]]);
  const known=new Map();prepareLiveMasters(graph,known,0);
  const writes=[];await publishHls(graph,async(key)=>writes.push(key),known,{now:0});
  assert.deepEqual(writes,['main_stream.m3u8','index.m3u8']);
  assert.match(graph.get('main_stream.m3u8').body.toString(),/#EXT-X-MEDIA-SEQUENCE:101/);
  assert.match(graph.get('main_stream.m3u8').body.toString(),/#EXT-X-DISCONTINUITY\n/);
});
