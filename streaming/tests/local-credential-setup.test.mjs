import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

async function start(file) {
  const child=spawn(process.execPath,['scripts/setup-r2-local.mjs'],{
    env:{...process.env,RCTV_BROADCAST_DIRECTORY:path.dirname(file),R2_SETUP_BUCKET:path.basename(file) === 'vod.env' ? 'rctv19-vod' : 'rctv19-live',R2_ACCOUNT_ID:'a'.repeat(32),SETUP_PORT:'0'},
    stdio:['ignore','pipe','pipe'],windowsHide:true,
  });
  let output=''; child.stdout.on('data',chunk=>{output+=chunk;});
  const url=await new Promise((resolve,reject)=>{
    child.stdout.on('data',()=>{const match=output.match(/Open (http:\/\/[^\s]+)/);if(match)resolve(match[1]);});
    child.once('error',reject);child.once('exit',code=>reject(new Error(`Setup stopped: ${code}`)));
  });
  return {child,url,output:()=>output};
}

test('local credential import rejects foreign origins, hides secrets and cannot overwrite',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'rctv19-credentials-'));
  const file=path.join(dir,'r2.env');
  let service;
  try {
    service=await start(file);
    const {url,child}=service;
    const origin=new URL(url).origin;
    const page=await fetch(url);
    assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.equal(page.headers.get('cache-control'),'no-store');
    assert.equal(page.headers.get('referrer-policy'),'same-origin');
    assert.match(await page.text(),/type="password"/);
    const body=new URLSearchParams({nonce:url.split('/').at(-1),accessKeyId:'b'.repeat(32),secretAccessKey:'c'.repeat(64)});
    assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://other.example'},body})).status,403);
    const saved=await fetch(url,{method:'POST',headers:{Origin:origin},body});
    assert.equal(saved.status,200);
    assert.doesNotMatch(await saved.text(),/c{64}/);
    await once(child,'exit');
    assert.match(await readFile(file,'utf8'),/R2_SECRET_ACCESS_KEY=c{64}/);
    assert.match(await readFile(file,'utf8'),/R2_BUCKET=rctv19-live/);
    assert.doesNotMatch(service.output(),/b{32}|c{64}/);

    await writeFile(file,'preserve this existing credential');
    service=await start(file);
    body.set('nonce',service.url.split('/').at(-1));
    const denied=await fetch(service.url,{method:'POST',headers:{Origin:new URL(service.url).origin},body});
    assert.equal(denied.status,500);
    await once(service.child,'exit');
    assert.equal(await readFile(file,'utf8'),'preserve this existing credential');
  } finally {
    service?.child.kill();
    await rm(dir,{recursive:true,force:true});
  }
});

test('replay import uses a separate private file and replay bucket',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'rctv19-credentials-'));
  const file=path.join(dir,'vod.env');
  let service;
  try {
    await writeFile(path.join(dir,'r2.env'),'existing live credential');
    service=await start(file);
    const origin=new URL(service.url).origin;
    const body=new URLSearchParams({nonce:service.url.split('/').at(-1),accessKeyId:'b'.repeat(32),secretAccessKey:'c'.repeat(64)});
    const saved=await fetch(service.url,{method:'POST',headers:{Origin:origin},body});
    assert.equal(saved.status,200);
    await once(service.child,'exit');
    assert.match(await readFile(file,'utf8'),/R2_BUCKET=rctv19-vod/);
    assert.equal(await readFile(path.join(dir,'r2.env'),'utf8'),'existing live credential');
  } finally { service?.child.kill(); await rm(dir,{recursive:true,force:true}); }
});
