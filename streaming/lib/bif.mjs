import assert from 'node:assert/strict';

const magic = Buffer.from([0x89,0x42,0x49,0x46,0x0d,0x0a,0x1a,0x0a]);
// Roku BIF v0: a 64-byte header, N+1 timestamp/offset pairs, then JPEGs.
export function createBif(frames, intervalMs = 10000) {
  assert.ok(frames.length > 0);
  assert.ok(Number.isInteger(intervalMs) && intervalMs > 0);
  const indexBytes = 64 + (frames.length + 1) * 8;
  const size = indexBytes + frames.reduce((sum, frame) => sum + frame.length, 0);
  assert.ok(size < 0xffffffff);
  const output = Buffer.alloc(size);
  magic.copy(output);
  output.writeUInt32LE(frames.length, 12);
  output.writeUInt32LE(intervalMs, 16);
  let offset = indexBytes;
  frames.forEach((frame, i) => {
    assert.ok(frame[0] === 0xff && frame[1] === 0xd8 && frame.at(-2) === 0xff && frame.at(-1) === 0xd9, 'BIF images must be JPEGs');
    output.writeUInt32LE(i, 64 + i * 8);
    output.writeUInt32LE(offset, 68 + i * 8);
    frame.copy(output, offset);
    offset += frame.length;
  });
  output.writeUInt32LE(0xffffffff, 64 + frames.length * 8);
  output.writeUInt32LE(offset, 68 + frames.length * 8);
  return output;
}

export function inspectBif(data) {
  assert.ok(data.length >= 80 && data.subarray(0,8).equals(magic), 'Invalid BIF header');
  assert.equal(data.readUInt32LE(8), 0);
  const count = data.readUInt32LE(12), intervalMs = data.readUInt32LE(16) || 1000;
  assert.ok(count > 0 && 64 + (count + 1) * 8 < data.length);
  assert.equal(data.readUInt32LE(64 + count * 8), 0xffffffff);
  assert.equal(data.readUInt32LE(68 + count * 8), data.length);
  for (let i = 0; i < count; i++) {
    const offset = data.readUInt32LE(68 + i * 8), end = data.readUInt32LE(76 + i * 8);
    assert.equal(data.readUInt32LE(64 + i * 8), i);
    assert.ok(offset >= 64 + (count + 1) * 8 && end > offset && end <= data.length);
    assert.equal(data.readUInt16BE(offset), 0xffd8);
    assert.equal(data.readUInt16BE(end - 2), 0xffd9);
  }
  return {count, intervalMs, lastTimestampSeconds: (count - 1) * intervalMs / 1000};
}
