const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { optimizedImage } = require('./image-assets');
async function main() {
  const root = path.resolve('src/assets/img');
  const files = await fs.readdir(root, { recursive: true });
  await fs.mkdir('_site/assets/optimized', { recursive: true });
  let original = 0, optimized = 0, count = 0;
  for (const file of files) {
    const url = '/assets/img/' + file.split(path.sep).join('/');
    if (optimizedImage(url) === url) continue;
    original += (await fs.stat(path.join(root,file))).size;
    for (const width of [480,960]) {
      const target = path.join('_site',optimizedImage(url,width));
      const result = await sharp(path.join(root,file)).rotate().resize({width,withoutEnlargement:true}).webp({quality:80}).toFile(target);
      if(width === 960) optimized += result.size;
    }
    count++;
  }
  console.log(`Optimized ${count} large images: ${(original/1e6).toFixed(1)} MB originals → ${(optimized/1e6).toFixed(1)} MB at 960px.`);
}
main().catch(error => {console.error(error); process.exitCode = 1;});
