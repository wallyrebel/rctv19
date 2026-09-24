import { readFile, writeFile, mkdir, stat, open, unlink, rename, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localBroadcastDirectory } from '../lib/local-paths.mjs';
import { validateCatalog } from '../lib/catalog.mjs';
import { workflowFailureMessage } from '../lib/workflow-errors.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jobs = path.join(localBroadcastDirectory(), 'show-jobs');
const [action, suppliedPath] = process.argv.slice(2);
if (!['prepare','publish'].includes(action) || !suppliedPath) throw new Error('Choose Prepare or Publish in the desktop tool.');
const jobPath = path.resolve(suppliedPath);
if (path.dirname(jobPath) !== jobs || !/^show-[a-f0-9-]+\.json$/.test(path.basename(jobPath))) throw new Error('Invalid saved job.');
const job = JSON.parse(await readFile(jobPath, 'utf8'));
if (!/^show-[a-f0-9-]+$/.test(job.id) || !job.title?.trim() || job.title.length > 160 || !['preserve','talk'].includes(job.quality)) throw new Error('Invalid show details.');
const work = path.join(jobs, job.id);
await mkdir(work, {recursive:true});
const ffmpeg = process.env.FFMPEG || (process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA, 'Microsoft/WinGet/Links/ffmpeg.exe') : 'ffmpeg');
const ffprobe = process.env.FFPROBE || (process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA, 'Microsoft/WinGet/Links/ffprobe.exe') : 'ffprobe');
const env = {...process.env, FFMPEG:ffmpeg, FFPROBE:ffprobe, VOD_PREPARED_DIRECTORY:path.join(work,'prepared'), VOD_VERSION:'v1', WRANGLER_SEND_METRICS:'false', CI:'true'};
const lockPath = path.join(jobs, 'publishing.lock');
let lock;
async function save(status, detail) {
  Object.assign(job, {status, detail, updatedAt:new Date().toISOString()});
  await writeFile(`${jobPath}.tmp`, JSON.stringify(job,null,2));
  await rename(`${jobPath}.tmp`, jobPath);
  console.log(detail);
}
function run(exe, args, extra={}) {
  return new Promise((resolve,reject)=>{
    const child = spawn(exe,args,{cwd:root,env:{...env,...extra},windowsHide:true,stdio:['ignore','pipe','pipe']});
    child.stdout.on('data', data=>process.stdout.write(data));
    // Classify a bounded stderr tail without persisting private tool output.
    let errors='';
    child.stderr.on('data',data=>errors=(errors+data).slice(-16000));
    child.on('error',()=>reject(new Error(`Could not start ${path.basename(exe)}.`)));
    child.on('close',code=>code===0?resolve():reject(new Error(workflowFailureMessage(exe,args,errors,code))));
  });
}
const script = (name,args=[],extra={})=>run(process.execPath,[path.join(root,'scripts',name),...args],extra);
async function publicCatalog() {
  const response=await fetch(`https://watch.rctv19.com/api/catalog.json?check=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error('The public program list could not be read. Nothing was replaced.');
  const data=await response.json();
  if(validateCatalog(data).length || data.channel?.id !== 'rctv19') throw new Error('The public RCTV 19 program list is invalid. Nothing was replaced.');
  return data;
}
async function exists(file) { try {await access(file);return true;} catch {return false;} }
try {
  try { lock=await open(lockPath,'wx'); }
  catch(error) {
    if(error.code!=='EEXIST') throw error;
    const owner=Number(await readFile(lockPath,'utf8'));
    let alive=true; try {process.kill(owner,0);} catch(e) {if(e.code==='ESRCH') alive=false;}
    if(alive || !Number.isInteger(owner) || owner<=0) throw new Error('Another show is being prepared or published. Wait for it to finish.');
    await unlink(lockPath); lock=await open(lockPath,'wx');
  }
  await lock.writeFile(String(process.pid));
  if(action==='prepare') {
    const source=await stat(job.source);
    if(!source.isFile()) throw new Error('Select a video file.');
    const fingerprint={size:source.size,mtimeMs:source.mtimeMs};
    if(job.sourceInfo && JSON.stringify(job.sourceInfo)!==JSON.stringify(fingerprint)) throw new Error('The source changed. Start a new show job instead.');
    job.sourceInfo=fingerprint;
    const ready=path.join(work,'prepared',job.id);
    if(await exists(path.join(ready,'ready.json'))) {
      job.preview=job.quality==='talk' ? path.join(work,'compressed.mp4') : job.source;
      await save('ready','Preparation is complete. Review the video, then choose Upload and publish.');
    } else {
      await save('preparing','Preparing video and TV previews. Your original file is kept unchanged.');
      let input=job.source;
      if(job.quality==='talk') {
        input=path.join(work,'compressed.mp4');
        if(!await exists(input)) {
          const temp=path.join(work,`compressed-${Date.now()}.mp4`);
          await run(ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-i',job.source,'-map','0:v:0','-map','0:a:0','-c:v','libx264','-threads','2','-preset','medium','-crf','22','-maxrate','2500k','-bufsize','5000k','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-n',temp]);
          await rename(temp,input);
        }
      }
      // Failed preparations remain separate; never treat partial output as ready.
      const staging=path.join(work,`preparing-${Date.now()}`);
      await script('prepare-vod.mjs',[input,job.id,job.title],{VOD_PREPARED_DIRECTORY:staging});
      await mkdir(path.dirname(ready),{recursive:true});
      await rename(path.join(staging,job.id),ready);
      const metadata=JSON.parse(await readFile(path.join(ready,'metadata.json'),'utf8'));
      metadata.category=job.category?.trim() || 'RCTV 19 Programs';
      await writeFile(path.join(ready,'metadata.json'),JSON.stringify(metadata,null,2));
      await writeFile(path.join(ready,'ready.json'),'{}');
      job.preview=input;
      job.preparedGB=Math.round(metadata.totalBytes/1e7)/100;
      job.durationMinutes=Math.max(1,Math.round(metadata.durationSeconds/60));
      await save('ready',`Ready: about ${job.durationMinutes} minutes, ${job.preparedGB} GB. Review picture and sound, then choose Upload and publish.`);
    }
  } else {
    if(!await exists(path.join(work,'prepared',job.id,'ready.json'))) throw new Error('Prepare and review this show first.');
    const current=await publicCatalog();
    if(current.videos.some(item=>item.id!==job.id && item.title.trim().toLowerCase()===job.title.trim().toLowerCase())) throw new Error('A show with this title already exists. Resume its original saved job, or start a new job with a different episode title.');
    await save('uploading','Uploading the show. Interrupted uploads can be resumed using this saved job.');
    await script('publish-vod.mjs',[job.id]);
    await save('verifying','Checking the public video, thumbnail, and TV previews.');
    const before=await publicCatalog();
    const candidate=path.join(work,'catalog.json');
    await writeFile(candidate,JSON.stringify(before,null,2));
    await script('add-vod-to-catalog.mjs',[job.id],{CATALOG_PATH:candidate});
    const output=path.join(work,'web');
    await script('build-web.mjs',[],{CATALOG_PATH:candidate,WEB_OUTPUT_DIRECTORY:output});
    const config=JSON.parse(await readFile(path.join(root,'wrangler.jsonc'),'utf8'));
    if(config.name !== 'rctv19-streaming' || !config.routes?.length || config.routes.some(route=>route.pattern !== 'watch.rctv19.com' || route.custom_domain !== true)) {
      throw new Error('The publishing configuration must target only the RCTV 19 watch website.');
    }
    config.assets.directory=output;
    const configPath=path.join(work,'wrangler.json');
    await writeFile(configPath,JSON.stringify(config,null,2));
    const latest=await publicCatalog();
    if(JSON.stringify(before)!==JSON.stringify(latest)) throw new Error('The program list changed during publishing. Retry to include those changes.');
    await save('publishing','Publishing the updated program list to the website and TV apps.');
    await run(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'deploy','--config',configPath]);
    const intended=JSON.parse(await readFile(candidate,'utf8'));
    let verified=false;
    for(let attempt=0;attempt<12;attempt++) {
      const actual=await publicCatalog();
      if(JSON.stringify(actual)===JSON.stringify(intended)) {verified=true;break;}
      await new Promise(resolve=>setTimeout(resolve,5000));
    }
    if(!verified) throw new Error('The deployment was sent, but public verification is pending. Retry this job before announcing the show.');
    // Sync the checked-in catalog only after the public deployment is verified.
    await writeFile(path.join(root,'catalog/rctv19.json'),JSON.stringify(intended,null,2)+'\n');
    await save('published','Published successfully! Refresh the website or reopen the TV app to see your show.');
  }
} catch(error) {
  if(lock) await save('error',error.message);
  else console.error(error.message);
  process.exitCode=1;
} finally {if(lock) {await lock.close();await unlink(lockPath);}}
