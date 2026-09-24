import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readReplayConfig } from '../lib/replay-config.mjs';

test('replay credentials stay isolated from a live broadcaster environment', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'replay-config-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const file=path.join(directory,'vod.env');
  await writeFile(file, 'R2_BUCKET=rctv19-vod\nR2_ACCOUNT_ID=0123456789abcdef0123456789abcdef\nR2_ACCESS_KEY_ID=replay-key\nR2_SECRET_ACCESS_KEY=replay-secret\n');
  const oldBucket=process.env.R2_BUCKET, oldKey=process.env.R2_ACCESS_KEY_ID;
  t.after(()=>{
    if(oldBucket===undefined) delete process.env.R2_BUCKET; else process.env.R2_BUCKET=oldBucket;
    if(oldKey===undefined) delete process.env.R2_ACCESS_KEY_ID; else process.env.R2_ACCESS_KEY_ID=oldKey;
  });
  process.env.R2_BUCKET='rctv19-live';process.env.R2_ACCESS_KEY_ID='live-key';
  const config=await readReplayConfig(file);
  assert.equal(config.bucket,'rctv19-vod');
  assert.equal(config.credentials.accessKeyId,'replay-key');
  assert.equal(process.env.R2_BUCKET,'rctv19-live');
  assert.equal(process.env.R2_ACCESS_KEY_ID,'live-key');
});

test('invalid or missing replay configuration fails without disclosing private values', async t => {
  const directory=await mkdtemp(path.join(tmpdir(),'replay-config-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const file=path.join(directory,'vod.env');
  const check=error=>{
    assert.equal(error.name,'ReplayConfigurationError');
    assert.doesNotMatch(error.message,/PRIVATE_SECRET|replay-config-/);
    return true;
  };
  await assert.rejects(readReplayConfig(file),check);
  await writeFile(file,'R2_BUCKET=rctv19-live\nR2_SECRET_ACCESS_KEY=PRIVATE_SECRET\n');
  await assert.rejects(readReplayConfig(file),check);
});
