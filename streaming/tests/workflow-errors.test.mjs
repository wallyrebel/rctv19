import test from 'node:test';
import assert from 'node:assert/strict';
import { workflowFailureMessage } from '../lib/workflow-errors.mjs';

test('upload errors explain credential failure without exposing request details',()=>{
  const result=workflowFailureMessage('node',['publish-vod.mjs'],'Replay publishing stopped (AccessDenied). secretAccessKey=PRIVATE_SECRET https://private.example/?token=SECRET',1);
  assert.match(result,/Video upload.*AccessDenied/);
  assert.match(result,/Cloudflare rejected/);
  assert.doesNotMatch(result,/PRIVATE_SECRET|private.example|token=/);
});
test('unrecognized tool errors never copy raw stderr',()=>{
  const result=workflowFailureMessage('node',['wrangler.js'],'Bearer PRIVATE_TOKEN https://private.example/secret',1);
  assert.match(result,/Website publishing stopped/);
  assert.doesNotMatch(result,/PRIVATE_TOKEN|private.example/);
});
test('missing local files are distinguished from network failures',()=>{
  assert.match(workflowFailureMessage('node',['prepare-vod.mjs'],'Error: ENOENT private file',1),/required local file/);
  assert.match(workflowFailureMessage('node',['publish-vod.mjs'],'Replay publishing stopped (TimeoutError).',1),/connection failed or timed out/);
});
