import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { localBroadcastDirectory } from '../lib/local-paths.mjs';
import { prepareTrickplay } from '../lib/prepare-trickplay.mjs';

const [input, id, title] = process.argv.slice(2);
if (!input || !/^[a-z0-9-]+$/.test(id || '') || !title) throw new Error('Usage: prepare-vod.mjs INPUT ID TITLE');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const ffprobe = process.env.FFPROBE || 'ffprobe';
function run(exe, args, capture = false) {
  return new Promise((resolve,reject) => {
    const child=spawn(exe,args,{windowsHide:true,stdio:['ignore',capture?'pipe':'ignore','pipe']});
    let output='',errors='';
    child.stdout?.on('data',b=>output+=b);
    child.stderr.on('data',b=>errors=(errors+b).slice(-4000));
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(output):reject(new Error(`${path.basename(exe)} failed (${code}): ${errors}`)));
  });
}
const metadata=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',input],true));
const video=metadata.streams.find(s=>s.codec_type==='video');
const audio=metadata.streams.find(s=>s.codec_type==='audio');
assert.equal(video?.codec_name,'h264','Remux requires H.264 source');
assert.equal(audio?.codec_name,'aac','Remux requires AAC source');
const parent=path.resolve(process.env.VOD_PREPARED_DIRECTORY || path.join(localBroadcastDirectory(),'vod'));
await mkdir(parent,{recursive:true});
const directory=path.join(parent,id);
// Never overwrite a prepared program or its original recording.
await mkdir(directory);
console.log(`Preparing ${title}; preserving source picture and sound.`);
await run(ffmpeg,['-nostdin','-hide_banner','-loglevel','warning','-i',input,'-map','0:v:0','-map','0:a:0','-c','copy','-sn','-dn','-avoid_negative_ts','make_zero','-f','hls','-hls_time','6','-hls_list_size','0','-hls_playlist_type','vod','-hls_flags','independent_segments','-hls_segment_filename',path.join(directory,'segment-%05d.ts'),path.join(directory,'main.m3u8')]);
const playlist=await readFile(path.join(directory,'main.m3u8'),'utf8');
assert.ok(playlist.includes('#EXT-X-ENDLIST'),'Replay must be finite');
const lines=playlist.trim().split(/\r?\n/);
let durationSeconds=0,totalBytes=0,maxRate=0,segmentCount=0;
for(let i=0;i<lines.length;i++) {
  if(!lines[i].startsWith('#EXTINF:')) continue;
  const duration=Number(lines[i].slice(8).split(',')[0]);
  const name=lines[++i];
  assert.match(name,/^segment-\d+\.ts$/);
  assert.ok(duration>0);
  const segment=await stat(path.join(directory,name));
  totalBytes+=segment.size;durationSeconds+=duration;segmentCount++;
  maxRate=Math.max(maxRate,segment.size*8/duration);
}
assert.ok(segmentCount>0);
assert.ok(Math.abs(durationSeconds-Number(metadata.format.duration))<3,'Prepared duration must match source');
await writeFile(path.join(directory,'index.m3u8'),`#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=${Math.ceil(maxRate*1.1)},RESOLUTION=${video.width}x${video.height}\nmain.m3u8\n`,{flag:'wx'});
await run(ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-ss',String(Math.min(60,durationSeconds/2)),'-i',input,'-frames:v','1','-vf','scale=640:-2','-q:v','3',path.join(directory,'thumbnail.jpg')]);
const report={id,title,durationSeconds,category:'RCTV 19 Shows',width:video.width,height:video.height,segmentCount,totalBytes,preparedAt:new Date().toISOString()};
await writeFile(path.join(directory,'metadata.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
await prepareTrickplay(input,directory,durationSeconds);
console.log(JSON.stringify(report));
