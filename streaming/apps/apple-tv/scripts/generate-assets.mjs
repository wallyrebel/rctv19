import sharp from 'sharp';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(appRoot, '../..');
const catalog = path.join(appRoot, 'Resources/Assets.xcassets');
const logo = await sharp(path.join(root, 'assets/source-logo.jpg'))
  .trim({ background: '#ffffff', threshold: 20 }).png().toBuffer();
const info = { author: 'xcode', version: 1 };
async function json(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}
async function artwork(file, width, height, { transparent = false, blank = false } = {}) {
  await mkdir(path.dirname(file), { recursive: true });
  const canvas = sharp({ create: { width, height, channels: 4,
    background: transparent ? '#ffffff00' : '#ffffff' } });
  const fitted = blank ? null : await sharp(logo).resize(Math.round(width * 0.88), Math.round(height * 0.80), { fit: 'inside' }).png().toBuffer();
  const output = fitted ? canvas.composite([{ input: fitted, gravity: 'centre' }]) : canvas;
  await (transparent ? output : output.removeAlpha()).png().toFile(file);
}
await json(path.join(catalog, 'Contents.json'), { info });
await artwork(path.join(catalog, 'StationLogo.imageset/logo.png'), 768, 292);
await json(path.join(catalog, 'StationLogo.imageset/Contents.json'), { info, images: [{ idiom: 'universal', filename: 'logo.png' }] });
for (const [asset, file] of [['LiveCover', 'live-cover.png'], ['ShowPlaceholder', 'show-placeholder.png']]) {
  const directory = path.join(catalog, `${asset}.imageset`);
  await mkdir(directory, { recursive: true });
  await copyFile(path.join(root, 'public/assets', file), path.join(directory, file));
  await json(path.join(directory, 'Contents.json'), { info, images: [{ idiom: 'universal', filename: file }] });
}
const brand = path.join(catalog, 'App Icon & Top Shelf Image.brandassets');
await json(path.join(brand, 'Contents.json'), { info, assets: [
  { size: '400x240', idiom: 'tv', filename: 'App Icon.imagestack', role: 'primary-app-icon' },
  { size: '1280x768', idiom: 'tv', filename: 'App Store Icon.imagestack', role: 'primary-app-icon' },
  { size: '1920x720', idiom: 'tv', filename: 'Top Shelf Image.imageset', role: 'top-shelf-image' },
  { size: '2320x720', idiom: 'tv', filename: 'Top Shelf Image Wide.imageset', role: 'top-shelf-image-wide' },
] });
for (const [name, width, height, scales] of [['App Icon', 400, 240, [1, 2]], ['App Store Icon', 1280, 768, [1]]]) {
  const stack = path.join(brand, `${name}.imagestack`);
  await json(path.join(stack, 'Contents.json'), { info, layers: ['Front', 'Middle', 'Back'].map(layer => ({ filename: `${layer}.imagestacklayer` })) });
  for (const layer of ['Front', 'Middle', 'Back']) {
    const directory = path.join(stack, `${layer}.imagestacklayer`);
    await json(path.join(directory, 'Contents.json'), { info });
    await json(path.join(directory, 'Content.imageset/Contents.json'), { info, images: scales.map(scale => ({ idiom: 'tv', scale: `${scale}x`, filename: `image-${scale}x.png` })) });
    for (const scale of scales) await artwork(path.join(directory, `Content.imageset/image-${scale}x.png`), width * scale, height * scale,
      { transparent: layer !== 'Back', blank: layer !== 'Front' });
  }
}
for (const [name, width] of [['Top Shelf Image', 1920], ['Top Shelf Image Wide', 2320]]) {
  const directory = path.join(brand, `${name}.imageset`);
  await json(path.join(directory, 'Contents.json'), { info, images: [1, 2].map(scale => ({ idiom: 'tv', scale: `${scale}x`, filename: `image-${scale}x.png` })) });
  for (const scale of [1, 2]) await artwork(path.join(directory, `image-${scale}x.png`), width * scale, 720 * scale);
}
const privacyHtml = await readFile(path.join(root, 'public/privacy.html'), 'utf8');
const privacyText = privacyHtml.split('<h1>')[1].split('<footer>')[0]
  .replace(/<a href="([^"]+)">([^<]+)<\/a>/g, (_, href, label) => `${label} (${href})`)
  .replace(/<\/(?:h1|h2|p)>/g, '\n\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
await writeFile(path.join(appRoot, 'Resources/PrivacyPolicy.txt'), privacyText + '\n');
console.log('Generated RCTV 19 Apple TV logo assets and packaged the RCTV streaming privacy policy.');
