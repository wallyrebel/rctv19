const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function optimizedImage(url, width = 960) {
  if (!url || !/^\/assets\/img\/.*\.(png|jpe?g|webp)$/i.test(url)) return url;
  const file = path.join(__dirname, '../src', url);
  if (!fs.existsSync(file) || fs.statSync(file).size < 100000) return url;
  const id = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,20);
  return `/assets/optimized/${id}-${width}.webp`;
}
module.exports = { optimizedImage };
