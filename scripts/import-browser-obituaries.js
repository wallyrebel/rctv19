// Import records captured from the funeral homes in Edge or Chrome.
// No generated or paraphrased obituary text is accepted by this workflow.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { SOURCES } = require('./obituary-sources');
const ROOT = path.resolve(__dirname, '..');
const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
function eligibility(record, now = new Date()) {
  const cutoff = now.getTime() - 86400000;
  for (const [basis, value] of [['publication', record.published], ['death', record.deathDate]]) {
    if (!value) continue;
    if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
      const time = Date.parse(value);
      if (Number.isFinite(time) && time >= cutoff && time <= now.getTime()) return { basis, value };
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // A date alone cannot establish that yesterday was less than 24h ago.
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      if (value === today) return { basis, value };
    }
  }
  return null;
}
function prepare(record, now = new Date()) {
  const source = SOURCES.find(s => s.id === record.sourceId);
  if (!source) throw new Error('Unknown funeral home');
  const url = new URL(record.url);
  if (url.origin !== source.home || !source.obituaryPath.test(url.pathname)) throw new Error('Unexpected source URL');
  url.search = ''; url.hash = '';
  if (!record.name || !Array.isArray(record.paragraphs) || !record.paragraphs.length || record.paragraphs.some(p => typeof p !== 'string' || !p.trim())) throw new Error('Missing original name or paragraphs');
  if (record.complete !== true) throw new Error('Full visible obituary must be verified before import');
  const eligible = eligibility(record, now);
  if (!eligible) return null;
  const id = `${slug(record.name)}-${crypto.createHash('sha256').update(url.href).digest('hex').slice(0, 10)}`;
  const front = {
    title: record.name, date: record.published && /^\d{4}-\d{2}-\d{2}/.test(record.published) ? record.published : eligible.value,
    layout: 'layouts/obituary.njk', templateEngineOverride: 'md',
    permalink: `/obituaries/${id}/index.html`, excerpt: `Obituary for ${record.name}, provided by ${source.name}.`,
    funeralHome: source.name, sourceUrl: url.href, birthDate: record.birthDate || '', deathDate: record.deathDate || '',
    importedAt: now.toISOString(), eligibilityBasis: eligible.basis, eligibilityDate: eligible.value,
    sourceTextSha256: crypto.createHash('sha256').update(record.paragraphs.join('\n\n')).digest('hex')
  };
  const body = record.paragraphs.map(p => `<p>${escape(p).replace(/\r?\n/g, '<br>')}</p>`).join('\n\n');
  return { id, front, body, url: url.href };
}
async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node scripts/import-browser-obituaries.js captured.json [--apply]');
  const apply = process.argv.includes('--apply');
  const records = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (!Array.isArray(records)) throw new Error('Input must be an array');
  const logPath = path.join(ROOT, 'scripts/published_obituaries.json');
  const seen = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : {};
  const now = new Date();
  for (const record of records) {
    const item = prepare(record, now);
    if (!item) { console.log(`Outside verified 24-hour window: ${record.name}`); continue; }
    const file = path.join(ROOT, 'src/obituaries', `${item.id}.md`);
    const existing = fs.readdirSync(path.dirname(file)).filter(f => f.endsWith('.md')).some(f => fs.readFileSync(path.join(path.dirname(file), f), 'utf8').includes(JSON.stringify(item.url)));
    if (seen[item.url] || existing || fs.existsSync(file)) { console.log(`Already published: ${record.name}`); continue; }
    if (!apply) { console.log(`Eligible: ${record.name} (${item.front.eligibilityBasis}: ${item.front.eligibilityDate})`); continue; }
    if (record.imageUrl) {
      try {
        const imageUrl = new URL(record.imageUrl);
        if (imageUrl.protocol !== 'https:' || !['d1rjyex4ui0ya6.cloudfront.net', 'cdn.f1connect.net', new URL(record.url).hostname].includes(imageUrl.hostname)) throw new Error('Unrecognized image host; review first');
        const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30000), redirect: 'error' });
        if (!response.ok || !/^image\//.test(response.headers.get('content-type') || '')) throw new Error(`Image response ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > 15000000) throw new Error('Image exceeds 15 MB');
        const meta = await require('sharp')(buffer).metadata();
        const extension = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif' }[meta.format];
        if (!extension) throw new Error('Unsupported image format');
        const relative = `/assets/img/obituaries/${item.id}.${extension}`;
        fs.mkdirSync(path.join(ROOT, 'src/assets/img/obituaries'), { recursive: true });
        fs.writeFileSync(path.join(ROOT, 'src', relative), buffer);
        item.front.featuredImage = relative;
        item.front.featuredImageAlt = record.name;
        item.front.imageSourceUrl = record.imageUrl;
      } catch (error) { console.error(`Portrait unavailable for ${record.name}: ${error.message}`); }
    }
    const markdown = ['---', ...Object.entries(item.front).map(([k,v]) => `${k}: ${JSON.stringify(v)}`), '---', '', item.body, ''].join('\n');
    fs.writeFileSync(file, markdown, { flag: 'wx' });
    seen[item.url] = { name: record.name, file: `src/obituaries/${item.id}.md`, importedAt: now.toISOString(), sourceTextSha256: item.front.sourceTextSha256 };
    fs.writeFileSync(logPath, JSON.stringify(seen, null, 2) + '\n');
    console.log(`Published locally: ${record.name} -> ${file}`);
  }
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { eligibility, prepare };
