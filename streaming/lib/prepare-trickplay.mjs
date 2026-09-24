import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createBif, inspectBif } from './bif.mjs';

export async function prepareTrickplay(input, directory, durationSeconds) {
  const framesDir = await mkdtemp(path.join(directory, '.trickplay-'));
  console.log('Preparing fast-forward previews at ten-second intervals.');
  await new Promise((resolve, reject) => {
    const child = spawn(process.env.FFMPEG || 'ffmpeg', ['-nostdin','-hide_banner','-loglevel','error',
      '-threads','2','-skip_frame','nokey','-i',input,'-an','-sn','-dn',
      '-vf','fps=1/10:start_time=0:round=up,scale=320:-1','-q:v','4','-start_number','0',path.join(framesDir,'%08d.jpg')],
      {windowsHide:true,stdio:['ignore','ignore','pipe']});
    let errors = '';
    child.stderr.on('data',b=>errors=(errors+b).slice(-2000));
    child.on('error',reject);
    child.on('close',code=>code===0?resolve():reject(new Error(`Preview generation failed: ${errors}`)));
  });
  const names = (await readdir(framesDir)).filter(n=>/^\d{8}\.jpg$/.test(n)).sort();
  assert.ok(Math.abs(names.length - Math.ceil(durationSeconds / 10)) <= 2, 'Preview coverage must match program duration');
  const hd = [], sd = [];
  for (const name of names) {
    const frame = await readFile(path.join(framesDir,name));
    hd.push(frame);
    sd.push(await sharp(frame).resize({width:240}).jpeg({quality:75}).toBuffer());
  }
  for (const [quality, frames] of [['hd',hd],['sd',sd]]) {
    const bif = createBif(frames);
    inspectBif(bif);
    await writeFile(path.join(directory,`trickplay-${quality}.bif`),bif,{flag:'wx'});
  }
  console.log(`Prepared ${names.length} preview images in HD and SD.`);
}
