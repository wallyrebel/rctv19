import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createBif, inspectBif } from '../lib/bif.mjs';
test('BIF index locates independently decodable JPEGs at 0, 10 and 20 seconds', async () => {
  const frames = await Promise.all(['red','green','blue'].map(background=>sharp({create:{width:320,height:180,channels:3,background}}).jpeg().toBuffer()));
  const data = createBif(frames);
  assert.deepEqual(inspectBif(data),{count:3,intervalMs:10000,lastTimestampSeconds:20});
  for (let i=0;i<3;i++) {
    const frame = data.subarray(data.readUInt32LE(68+i*8),data.readUInt32LE(76+i*8));
    assert.deepEqual(frame,frames[i]);
    assert.equal((await sharp(frame).metadata()).width,320);
  }
  const truncated = data.subarray(0,data.length-1);
  assert.throws(()=>inspectBif(truncated));
  const invalid = Buffer.from(data);
  invalid.writeUInt32LE(0,68);
  assert.throws(()=>inspectBif(invalid));
});
