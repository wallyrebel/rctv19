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
  const cutoff = now.getTime() - 48 * 60 * 60 * 1000;
  const centralDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  // A supplied publication date is authoritative, even if stale or invalid.
  // Death is a fallback only when publication evidence is absent.
  const hasPublication = record.published !== undefined && record.published !== null && record.published !== '';
  for (const [basis, value] of [hasPublication ? ['publication', record.published] : ['death', record.deathDate]]) {
    if (!value) continue;
    if (typeof value !== 'string') continue;
    const calendarDay = value.slice(0, 10);
    const validDay = /^\d{4}-\d{2}-\d{2}$/.test(calendarDay) && !Number.isNaN(Date.parse(calendarDay)) && new Date(calendarDay).toISOString().slice(0, 10) === calendarDay;
    if (!validDay) continue;
    if (/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) {
      const time = Date.parse(value);
      if (Number.isFinite(time) && time >= cutoff && time <= now.getTime()) return { basis, value };
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // Only accept a whole Central calendar day inside the window. This also
      // handles the 25-hour fall DST day conservatively; never guess a time.
      const valid = !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
      if (valid && value > centralDate(new Date(cutoff)) && value <= centralDate(now)) return { basis, value };
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
function readExisting(file, url, entry) {
  const markdown = fs.readFileSync(file, 'utf8');
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('Cannot safely update existing obituary: ' + file);
  const front = Object.fromEntries(match[1].split(/\r?\n/).map(line => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon), JSON.parse(line.slice(colon + 1))];
  }));
  const $ = require('cheerio').load(match[2]);
  $('br').replaceWith('\n');
  const hash = crypto.createHash('sha256').update($('p').toArray().map(p => $(p).text()).join('\n\n')).digest('hex');
  if (front.sourceUrl !== url || hash !== front.sourceTextSha256 || (entry && hash !== entry.sourceTextSha256)) throw new Error('Existing obituary differs from publication log; review before updating: ' + file);
  return front;
}
async function downloadPortrait(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
      if (!response.ok) {
        const error = new Error(`Image response ${response.status}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      if (!/^image\//.test(response.headers.get('content-type') || '')) {
        const error = new Error('Image response is not an image');
        error.retryable = false;
        throw error;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt >= 2 || error.retryable === false) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}
async function importRecords(records, { root = ROOT, apply = false, updateExisting = false, now = new Date() } = {}) {
  if (!Array.isArray(records)) throw new Error('Input must be an array');
  const logPath = path.join(root, 'scripts/published_obituaries.json');
  const seen = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : {};
  for (const record of records) {
    const item = prepare(record, now);
    if (!item) { console.log(`Outside verified 48-hour window: ${record.name}`); continue; }
    const directory = path.join(root, 'src/obituaries');
    const matches = fs.readdirSync(directory).filter(f => f.endsWith('.md') && fs.readFileSync(path.join(directory, f), 'utf8').includes(JSON.stringify(item.url)));
    if (matches.length > 1) throw new Error('Duplicate source URL requires review: ' + item.url);
    const existing = matches[0];
    if (seen[item.url] && !existing) throw new Error('Publication log has no matching obituary: ' + item.url);
    if (existing && !updateExisting) { console.log(`Already published: ${record.name}`); continue; }
    const file = path.join(directory, existing || `${item.id}.md`);
    const previous = existing ? readExisting(file, item.url, seen[item.url]) : null;
    // A changed source timestamp cannot reopen an expired published notice.
    if (previous && !eligibility(previous.eligibilityBasis === 'publication'
      ? { published: previous.eligibilityDate }
      : { deathDate: previous.eligibilityDate }, now)) {
      console.log(`Outside original 48-hour window: ${record.name}`);
      continue;
    }
    const needsImage = record.imageUrl && (record.imageUrl !== previous?.imageSourceUrl || !previous?.featuredImage || !fs.existsSync(path.join(root, 'src', previous.featuredImage)));
    const unchangedText = previous && previous.sourceTextSha256 === item.front.sourceTextSha256 && previous.title === record.name && previous.birthDate === (record.birthDate || '') && previous.deathDate === (record.deathDate || '');
    if (unchangedText && !needsImage) { console.log(`Unchanged: ${record.name}`); continue; }
    if (!apply) { console.log(`${previous ? 'Update eligible' : 'Eligible'}: ${record.name} (${item.front.eligibilityBasis}: ${item.front.eligibilityDate})`); continue; }
    if (previous) {
      item.id = path.basename(file, '.md');
      item.front = { ...previous, ...item.front, date: previous.date, permalink: previous.permalink, importedAt: previous.importedAt, eligibilityBasis: previous.eligibilityBasis, eligibilityDate: previous.eligibilityDate, updated: now.toISOString() };
    }
    let imageSaved = false;
    if (record.imageUrl && (!previous || needsImage)) {
      try {
        const imageUrl = new URL(record.imageUrl);
        if (imageUrl.protocol !== 'https:' || !['d1rjyex4ui0ya6.cloudfront.net', 'cdn.f1connect.net', new URL(record.url).hostname].includes(imageUrl.hostname)) throw new Error('Unrecognized image host; review first');
        const buffer = await downloadPortrait(imageUrl);
        if (buffer.length > 15000000) throw new Error('Image exceeds 15 MB');
        const meta = await require('sharp')(buffer).metadata();
        const extension = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif' }[meta.format];
        if (!extension) throw new Error('Unsupported image format');
        const relative = `/assets/img/obituaries/${item.id}.${extension}`;
        fs.mkdirSync(path.join(root, 'src/assets/img/obituaries'), { recursive: true });
        fs.writeFileSync(path.join(root, 'src', relative), buffer);
        item.front.featuredImage = relative;
        item.front.featuredImageAlt = record.name;
        item.front.imageSourceUrl = record.imageUrl;
        imageSaved = true;
      } catch (error) { console.error(`Portrait unavailable for ${record.name}: ${error.message}`); }
    }
    // Retrying an unavailable portrait must not create an otherwise empty update.
    if (unchangedText && !imageSaved) continue;
    const markdown = ['---', ...Object.entries(item.front).map(([k,v]) => `${k}: ${JSON.stringify(v)}`), '---', '', item.body, ''].join('\n');
    fs.writeFileSync(file, markdown, { flag: previous ? 'w' : 'wx' });
    seen[item.url] = { ...seen[item.url], name: record.name, file: `src/obituaries/${item.id}.md`, importedAt: item.front.importedAt, sourceTextSha256: item.front.sourceTextSha256, ...(previous ? { updatedAt: now.toISOString() } : {}) };
    fs.writeFileSync(logPath, JSON.stringify(seen, null, 2) + '\n');
    console.log(`${previous ? 'Updated' : 'Published'} locally: ${record.name} -> ${file}`);
  }
}
async function main() {
  const [input, ...flags] = process.argv.slice(2);
  if (!input || flags.some(flag => !['--apply', '--update-existing'].includes(flag))) throw new Error('Usage: node scripts/import-browser-obituaries.js captured.json [--update-existing] [--apply]');
  await importRecords(JSON.parse(fs.readFileSync(input, 'utf8')), { apply: flags.includes('--apply'), updateExisting: flags.includes('--update-existing') });
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { eligibility, prepare, importRecords };
