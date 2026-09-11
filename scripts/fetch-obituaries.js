// Publishes obituaries from the local funeral homes, verbatim and attributed.
//
//   node scripts/fetch-obituaries.js           # report what it can reach, write nothing
//   node scripts/fetch-obituaries.js --apply   # publish anything new
//   node scripts/fetch-obituaries.js --source mcbride
//
// Every source currently sits behind bot protection. When a request is
// challenged this stops and says so. It does not retry around the challenge,
// rotate identity, or render the page in a headless browser: the funeral homes
// have given RCTV19 permission to republish, so the fix is for them to let our
// crawler through or send us a feed. See docs/obituaries.md.
const fs = require('node:fs');
const path = require('node:path');
const { SOURCES, USER_AGENT, isBotChallenge, parseObituary, listingLinks } = require('./obituary-sources');

const OBIT_DIR = path.join(__dirname, '../src/obituaries');
const SEEN_LOG = path.join(__dirname, 'published_obituaries.json');
const POLITE_DELAY_MS = 3000;
const MAX_PER_SOURCE = 10;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function get(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }, redirect: 'follow' });
  const body = await response.text();
  if (isBotChallenge(response.status, body)) {
    const error = new Error(`blocked by bot protection (HTTP ${response.status})`);
    error.blocked = true;
    throw error;
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return body;
}

const slugify = value => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function readSeen() {
  try { return JSON.parse(fs.readFileSync(SEEN_LOG, 'utf8')); } catch { return {}; }
}

function toMarkdown(obit) {
  const date = obit.published || obit.deathDate || new Date().toISOString().slice(0, 10);
  const slug = `${date}-${slugify(obit.name)}`;
  const front = {
    title: obit.name,
    date,
    layout: 'layouts/obituary.njk',
    permalink: `/obituaries/${slugify(obit.name)}/index.html`,
    excerpt: `Obituary for ${obit.name}, published by ${obit.sourceName}.`,
    funeralHome: obit.sourceName,
    sourceUrl: obit.url
  };
  if (obit.deathDate) front.deathDate = obit.deathDate;
  if (obit.birthDate) front.birthDate = obit.birthDate;
  const lines = ['---'];
  for (const [key, value] of Object.entries(front)) lines.push(`${key}: ${key === 'date' ? value : JSON.stringify(value)}`);
  lines.push('---', '');
  // The obituary exactly as the funeral home published it.
  lines.push(obit.body, '');
  return { fileName: `${slug}.md`, markdown: lines.join('\n') };
}

async function collect(source) {
  const listing = await get(source.listing);
  const links = listingLinks(listing, source).slice(0, MAX_PER_SOURCE);
  const obituaries = [];
  for (const link of links) {
    await sleep(POLITE_DELAY_MS);
    try {
      obituaries.push(parseObituary(await get(link), link, source));
    } catch (error) {
      if (error.blocked) throw error;
      console.log(`    could not read ${link}: ${error.message}`);
    }
  }
  return obituaries;
}

async function main() {
  const applying = process.argv.includes('--apply');
  const flag = process.argv.indexOf('--source');
  const only = flag === -1 ? '' : (process.argv[flag + 1] || '').toLowerCase();
  const selected = SOURCES.filter(source => !only || source.id === only);
  if (only && !selected.length) {
    console.error(`Unknown source "${only}". Known sources: ${SOURCES.map(s => s.id).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const seen = readSeen();
  let published = 0;
  let blocked = 0;

  for (const source of selected) {
    console.log(`\n${source.name} (${source.platform})`);
    let obituaries;
    try {
      obituaries = await collect(source);
    } catch (error) {
      if (error.blocked) {
        blocked++;
        console.log(`  ${error.message}`);
        console.log('  Ask this funeral home to allow the RCTV19 crawler or send a feed (docs/obituaries.md).');
        continue;
      }
      console.log(`  could not reach listing: ${error.message}`);
      continue;
    }

    for (const obit of obituaries) {
      if (seen[obit.url]) continue;
      if (!obit.complete) {
        console.log(`  incomplete, needs a person: ${obit.name || obit.url}`);
        continue;
      }
      const { fileName, markdown } = toMarkdown(obit);
      console.log(`  ${applying ? 'publishing' : 'would publish'}: ${obit.name}`);
      if (applying) {
        fs.mkdirSync(OBIT_DIR, { recursive: true });
        try {
          fs.writeFileSync(path.join(OBIT_DIR, fileName), markdown, { flag: 'wx' });
        } catch (error) {
          if (error.code === 'EEXIST') { console.log('    already published under that name, skipping'); continue; }
          throw error;
        }
        seen[obit.url] = { name: obit.name, published: new Date().toISOString().slice(0, 10) };
        published++;
      }
    }
  }

  if (applying && published) fs.writeFileSync(SEEN_LOG, JSON.stringify(seen, null, 2));
  console.log(`\n${published} published, ${blocked} source(s) blocked by bot protection.`);
  if (!applying) console.log('Report only. Re-run with --apply to publish.');
  // A blocked source is a known condition to report, not a build failure.
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { toMarkdown, slugify };
