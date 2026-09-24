import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const executable=fileURLToPath(new URL('../scripts/show-workflow.mjs',import.meta.url));
async function fixture(t) {
  const directory=await mkdtemp(path.join(tmpdir(),'rctv19-workflow-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const jobs=path.join(directory,'show-jobs');await mkdir(jobs);
  const file=path.join(jobs,'show-abcdef.json');
  const job={id:'show-abcdef',title:'Episode test',quality:'preserve',source:path.join(directory,'missing.mp4')};
  await writeFile(file,JSON.stringify(job));
  const run=action=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[executable,action,file],{env:{...process.env,RCTV_BROADCAST_DIRECTORY:directory,LOCALAPPDATA:directory},stdio:'ignore'});
    child.on('error',reject);child.on('close',resolve);
  });
  return {directory,jobs,file,job,run};
}
test('publish refuses an unprepared show before any network upload',async t=>{
  const f=await fixture(t);
  assert.equal(await f.run('publish'),1);
  const result=JSON.parse(await readFile(f.file,'utf8'));
  assert.equal(result.status,'error');assert.match(result.detail,/Prepare and review/);
});
test('a concurrent launch cannot alter the active saved job',async t=>{
  const f=await fixture(t);const original=await readFile(f.file,'utf8');
  await writeFile(path.join(f.jobs,'publishing.lock'),String(process.pid));
  assert.equal(await f.run('prepare'),1);
  assert.equal(await readFile(f.file,'utf8'),original);
  assert.equal(await readFile(path.join(f.jobs,'publishing.lock'),'utf8'),String(process.pid));
});
test('changed source is rejected before reusing a prepared copy',async t=>{
  const f=await fixture(t);await writeFile(f.job.source,'changed file');
  await writeFile(f.file,JSON.stringify({...f.job,sourceInfo:{size:1,mtimeMs:1}}));
  assert.equal(await f.run('prepare'),1);
  assert.match(JSON.parse(await readFile(f.file,'utf8')).detail,/source changed/);
});
