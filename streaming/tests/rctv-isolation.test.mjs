import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { localBroadcastDirectory, r2CredentialFile } from '../lib/local-paths.mjs';
import { readLiveConfig, validateLiveConfig } from '../lib/live-config.mjs';
import { readReplayConfig } from '../lib/replay-config.mjs';
import { explicitRokuTarget } from '../lib/roku-target.mjs';

test('runtime ignores inherited channel paths and rejects shared or synced folders', t => {
  const names = ['RCTV_BROADCAST_DIRECTORY','SPORTS_BROADCAST_DIRECTORY','R2_ENV_FILE','LOCALAPPDATA'];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  t.after(() => { for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name]; } });
  delete process.env.RCTV_BROADCAST_DIRECTORY;
  process.env.SPORTS_BROADCAST_DIRECTORY = path.join(os.tmpdir(), 'other-channel');
  process.env.R2_ENV_FILE = path.join(os.tmpdir(), 'other-channel', 'r2.env');
  process.env.LOCALAPPDATA = path.join(os.tmpdir(), 'redirected-local-cache');
  assert.equal(localBroadcastDirectory(), path.join(process.env.USERPROFILE || os.homedir(), '.rctv19-streaming'));
  assert.equal(path.basename(r2CredentialFile('vod')), 'vod.env');
  assert.notEqual(r2CredentialFile(), process.env.R2_ENV_FILE);
  for (const value of ['relative-rctv19', path.join(os.tmpdir(), 'OneDrive', 'rctv19'), path.join(os.tmpdir(), 'other-channel')]) {
    process.env.RCTV_BROADCAST_DIRECTORY = value;
    assert.throws(() => localBroadcastDirectory());
  }
  process.env.RCTV_BROADCAST_DIRECTORY = path.join(os.tmpdir(), 'rctv19-isolation');
  assert.equal(r2CredentialFile(), path.join(process.env.RCTV_BROADCAST_DIRECTORY, 'r2.env'));
  assert.throws(() => r2CredentialFile('other'));
});

test('live and replay configuration cannot select another channel or each other', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'rctv19-config-'));
  t.after(() => rm(directory, {recursive:true,force:true}));
  const file = path.join(directory, 'config.env');
  const values = {R2_BUCKET:'rctv19-live',R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'local-test-key',R2_SECRET_ACCESS_KEY:'PRIVATE_SECRET'};
  assert.equal(validateLiveConfig(values).R2_BUCKET, 'rctv19-live');
  for (const bucket of ['unrelated-live','rctv19-vod']) assert.throws(() => validateLiveConfig({...values,R2_BUCKET:bucket}), error => error.name === 'LiveConfigurationError' && !error.message.includes('PRIVATE_SECRET'));
  await writeFile(file, Object.entries({...values,R2_BUCKET:'unrelated-vod'}).map(([key,value])=>`${key}=${value}`).join('\n'));
  await assert.rejects(readReplayConfig(file), {name:'ReplayConfigurationError'});
  await assert.rejects(readLiveConfig(file), {name:'LiveConfigurationError'});
  await writeFile(file, Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n'));
  assert.deepEqual(await readLiveConfig(file), values);
  await assert.rejects(readReplayConfig(file), {name:'ReplayConfigurationError'});
});

test('Roku signing requires an explicit channel runtime and current local target', t => {
  const old = process.env.RCTV_BROADCAST_DIRECTORY;
  t.after(() => { if (old === undefined) delete process.env.RCTV_BROADCAST_DIRECTORY; else process.env.RCTV_BROADCAST_DIRECTORY = old; });
  delete process.env.RCTV_BROADCAST_DIRECTORY;
  assert.throws(() => explicitRokuTarget('192.168.1.2'), /explicit private/);
  process.env.RCTV_BROADCAST_DIRECTORY = path.join(os.tmpdir(), 'rctv19-signing-test');
  for (const host of [undefined,'','example.com','8.8.8.8','192.168.1.999','127.0.0.1']) assert.throws(() => explicitRokuTarget(host));
  assert.equal(explicitRokuTarget('192.168.1.2').host, '192.168.1.2');
});
