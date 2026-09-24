import test from 'node:test';
import assert from 'node:assert/strict';
import {continueMediaPlaylist} from '../lib/hls-continuity.mjs';
const raw=(source,start,count=3)=>`#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-MEDIA-SEQUENCE:${start}\n`+Array.from({length:count},(_,i)=>`#EXTINF:6,\n${source}_main_seg${start+i}.ts\n`).join('');
const seq=text=>Number(text.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)[1]);
const disc=text=>Number(text.match(/#EXT-X-DISCONTINUITY-SEQUENCE:(\d+)/)[1]);
test('reconnect preserves unique segment numbers and marks the timestamp discontinuity',()=>{
 const first=continueMediaPlaylist(raw('sourceA',100),null);
 const restart=continueMediaPlaylist(raw('sourceB',0),first);
 assert.equal(seq(restart),103);
 assert.equal(disc(restart),0);
 assert.match(restart,/#EXT-X-DISCONTINUITY\n#EXTINF/);
 const growing=continueMediaPlaylist(raw('sourceB',0,4),restart);
 assert.equal(seq(growing),103);assert.equal(disc(growing),0);
 const sliding=continueMediaPlaylist(raw('sourceB',1,4),growing);
 assert.equal(seq(sliding),104);assert.equal(disc(sliding),1);
 assert.doesNotMatch(sliding,/#EXT-X-DISCONTINUITY\n/);
 const another=continueMediaPlaylist(raw('sourceC',20),sliding);
 assert.equal(seq(another),108);assert.equal(disc(another),1);
});
test('a persisted public playlist restores offsets after uploader restart and long gaps',()=>{
 const legacy=raw('old',200);
 const first=continueMediaPlaylist(raw('new',5),legacy);
 const afterOffline=continueMediaPlaylist(raw('new',500),first);
 assert.equal(seq(afterOffline),698);assert.equal(disc(afterOffline),1);
 assert.throws(()=>continueMediaPlaylist(raw('new',490),afterOffline),/Stale/);
 assert.equal(continueMediaPlaylist(raw('new',500),afterOffline),afterOffline);
});
