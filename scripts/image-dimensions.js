const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { optimizedImage } = require('./image-assets');

// Intrinsic size of every source image, keyed by its site-root URL. Filled in
// before the build renders so that templates can emit width/height synchronously.
const intrinsic = new Map();

async function loadDimensions(imageRoot = 'src/assets/img') {
  const root = path.resolve(imageRoot);
  const files = await fs.readdir(root, { recursive: true });
  for (const file of files) {
    const url = '/assets/img/' + file.split(path.sep).join('/');
    if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(url)) continue;
    try {
      const { width, height, orientation } = await sharp(path.join(root, file)).metadata();
      if (!width || !height) continue;
      // A rotated EXIF orientation swaps the axes once the image is decoded.
      const rotated = orientation >= 5 && orientation <= 8;
      intrinsic.set(url, { width: rotated ? height : width, height: rotated ? width : height });
    } catch {
      // An unreadable image simply gets no dimensions; the template falls back.
    }
  }
  return intrinsic;
}

// Size the browser should reserve for the file that will actually be served.
// Matching it to the real aspect ratio is what keeps the article's largest image
// from shifting the layout once it loads.
// Pass width 0 for the untouched source file, which is what social previews link to.
function imageSize(url, width = 960) {
  const source = intrinsic.get(url);
  if (!source) return null;
  if (!width) return { ...source };
  // Large images are re-encoded to `width` at build time, never enlarged.
  const served = optimizedImage(url, width) === url ? source.width : Math.min(source.width, width);
  return { width: served, height: Math.round((source.height * served) / source.width) };
}

// Byte size of an asset as it is served, for RSS enclosures.
function assetBytes(url) {
  if (!/^\/assets\//.test(String(url || ''))) return 0;
  try {
    return require('node:fs').statSync(path.join(__dirname, '../src', url)).size;
  } catch {
    return 0;
  }
}

module.exports = { loadDimensions, imageSize, assetBytes, intrinsic };
