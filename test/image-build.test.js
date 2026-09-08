const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const sharp = require('sharp');

test('a clean direct Eleventy build ships every image candidate, including sponsor ads', {timeout:120000}, async t => {
  const output = await fs.mkdtemp(path.join(process.cwd(),'rctv-image-build-'));
  t.after(()=>fs.rm(output,{recursive:true,force:true}));
  // Deliberately bypass npm scripts and use a new output directory: stale local
  // image files must not mask a deployment that omits the optimization step.
  await promisify(execFile)(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs','--quiet','--output='+path.relative(process.cwd(),output).split(path.sep).join('/')], {cwd:path.join(__dirname,'..'),maxBuffer:1024*1024});
  const html = await fs.readFile(path.join(output,'index.html'),'utf8');
  const images = [...html.matchAll(/\/assets\/optimized\/[a-f0-9]+-\d+\.webp/g)].map(m=>m[0]);
  assert.ok(images.length > 0);
  assert.match(html, /src="\/assets\/optimized\/[^\"]+"\s+alt="The Peoples Bank"/);
  for (const image of new Set(images)) {
    const metadata = await sharp(await fs.readFile(path.join(output,image))).metadata();
    assert.equal(metadata.format,'webp');
    assert.ok(metadata.width > 0 && metadata.height > 0);
  }
});
