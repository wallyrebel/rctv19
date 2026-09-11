const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseObituary, listingLinks, isBotChallenge, cleanName, SOURCES } = require('../scripts/obituary-sources');
const { toMarkdown } = require('../scripts/fetch-obituaries');

const source = SOURCES.find(s => s.id === 'mcbride');
const cfs = SOURCES.find(s => s.id === 'ripley');

// Synthetic. Never commit a real person's obituary as a fixture.
const page = `<html><head>
<title>Mrs. Jane Q. Sample | Example Funeral Home</title>
<meta property="og:title" content="Mrs. Jane Q. Sample Obituary">
<meta property="og:description" content="Jane Q. Sample, 81, of Ripley.">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Person","name":"Mrs. Jane Q. Sample",
 "birthDate":"1945-03-02","deathDate":"2026-09-09","datePublished":"2026-09-10T08:00:00Z",
 "articleBody":"Jane Q. Sample, 81, of Ripley, passed away Tuesday, September 9, 2026. She was born March 2, 1945, to John and Mary Sample. She was a member of Example Baptist Church and worked for thirty years at the Example Company. She is survived by her husband of sixty years, her two daughters, and four grandchildren. Visitation will be held Friday from 5 until 8 p.m. at the funeral home, with services Saturday at 2 p.m."}
</script></head><body></body></html>`;

test('an obituary is taken from structured data without interpretation', () => {
  const obit = parseObituary(page, 'https://example.com/obituaries/jane-sample/', source);
  assert.equal(obit.name, 'Mrs. Jane Q. Sample');
  assert.equal(obit.deathDate, '2026-09-09');
  assert.equal(obit.birthDate, '1945-03-02');
  assert.equal(obit.published, '2026-09-10');
  assert.match(obit.body, /^Jane Q\. Sample, 81, of Ripley/);
  assert.match(obit.body, /Visitation will be held Friday from 5 until 8 p\.m\./);
  assert.equal(obit.complete, true);
});

test('the published text is byte-for-byte what the funeral home wrote', () => {
  const obit = parseObituary(page, 'https://example.com/obituaries/jane-sample/', source);
  const { markdown } = toMarkdown(obit);
  const body = markdown.split('---\n\n')[1].trim();
  assert.equal(body, obit.body, 'the obituary body is republished unaltered');
  assert.match(markdown, /funeralHome: "McBride Funeral Home"/);
  assert.match(markdown, /sourceUrl: "https:\/\/example\.com\/obituaries\/jane-sample\/"/);
});

test('a partial extraction is never published as an obituary', () => {
  const thin = page.replace(/"articleBody":"[^"]*"/, '"articleBody":"Services pending."');
  assert.equal(parseObituary(thin, 'https://example.com/x/', source).complete, false);
  const nameless = page.replace(/<title>[\s\S]*?<\/title>/, '').replace(/og:title[^>]*>/, '>').replace(/"name":"[^"]*",/, '');
  assert.equal(parseObituary(nameless, 'https://example.com/x/', source).complete, false);
});

test('bot protection is recognised as a refusal, in every shape it arrives', () => {
  assert.equal(isBotChallenge(403, ''), true);
  assert.equal(isBotChallenge(503, ''), true);
  assert.equal(isBotChallenge(200, '<title>Just a moment...</title>'), true);
  assert.equal(isBotChallenge(200, 'Sorry, you have been blocked'), true);
  assert.equal(isBotChallenge(200, '<html><body>A real obituary page</body></html>'), false);
});

test('only links shaped like that source obituaries are followed', () => {
  const listing = `<a href="/obituaries/jane-sample/">Jane</a>
    <a href="/obituaries/john-doe-2/">John</a>
    <a href="/store/?icc=fs_store&icn=obit_search&tid=123">Flowers</a>
    <a href="/obituaries/obituary-notification/">Notifications</a>
    <a href="https://facebook.com/share">Share</a>
    <a href="/obituaries/jane-sample/">Jane again</a>`;
  const links = listingLinks(listing, source);
  assert.deepEqual(links.sort(), [
    'https://www.mcbridefuneralhome.com/obituaries/jane-sample/',
    'https://www.mcbridefuneralhome.com/obituaries/john-doe-2/',
    'https://www.mcbridefuneralhome.com/obituaries/obituary-notification/'
  ]);
  assert.ok(!links.some(link => link.includes('/store/')), 'the flower shop is not an obituary');
  assert.ok(!links.some(link => link.includes('facebook')), 'offsite links are not followed');
});

test('the CFS sources use their own URL shape', () => {
  const links = listingLinks('<a href="/obituary/Jane-Sample">x</a><a href="/obituary/Jane-Sample/send-flowers">y</a>', cfs);
  assert.deepEqual(links, ['https://www.ripleyfuneralhome.com/obituary/Jane-Sample']);
});

test('trailing site names are trimmed from a headline but the person keeps theirs', () => {
  assert.equal(cleanName('Mrs. Jane Q. Sample | Example Funeral Home'), 'Mrs. Jane Q. Sample');
  assert.equal(cleanName('Obituary for John Smith-Jones'), 'John Smith-Jones');
  assert.equal(cleanName('Mary Ellen McMillin'), 'Mary Ellen McMillin');
});

test('an obituary builds through the real layout with attribution and no in-body ad', async t => {
  const { default: Eleventy } = await import('@11ty/eleventy');
  // The project config pins dir.output, so this builds the real output directory.
  const root = path.join(__dirname, '../_site');
  const file = path.join(__dirname, '../src/obituaries/2026-09-10-obituary-layout-fixture.md');
  const obit = parseObituary(page, 'https://example.com/obituaries/jane-sample/', source);
  await fs.promises.writeFile(file, toMarkdown(obit).markdown, { flag: 'wx' });
  t.after(async () => {
    await fs.promises.rm(file, { force: true });
    // Leave no fixture page behind for the next build to validate.
    await fs.promises.rm(path.join(root, 'obituaries/mrs-jane-q-sample'), { recursive: true, force: true });
  });

  const eleventy = new Eleventy('src', root, { configPath: path.join(__dirname, '../.eleventy.js') });
  await eleventy.write();
  const html = await fs.promises.readFile(path.join(root, 'obituaries/mrs-jane-q-sample/index.html'), 'utf8');
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /Visitation will be held Friday from 5 until 8 p\.m\./);
  assert.match(html, /published with permission/);
  assert.match(html, /McBride Funeral Home/);
  assert.equal((html.match(/in-feed-ad-wrapper/g) || []).length, 0, 'no advertisement inside an obituary');
  const index = await fs.promises.readFile(path.join(root, 'obituaries/index.html'), 'utf8');
  assert.match(index, /Mrs\. Jane Q\. Sample/);
});
