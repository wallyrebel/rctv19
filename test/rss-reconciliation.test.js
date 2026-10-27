const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { processFeeds } = require('../scripts/fetch-rss-summary');
const { sourceFingerprint, reviewedDuplicate, pageTitle } = require('../scripts/rss-reconciliation');
const repeat = require('./fixtures/rss/pet-costume-repeat.json');
const records = require('../scripts/rss-reviewed-events.json');
const repoBlog = path.join(__dirname, '../src/blog');

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rctv-rss-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const blogDir = path.join(root, 'blog');
  await fs.mkdir(blogDir);
  const anchor = records[0].publishedFile;
  await fs.copyFile(path.join(repoBlog, anchor), path.join(blogDir, anchor));
  const processedItems = [];
  const messages = [];
  return { root, blogDir, srcDir: root, processedItems, now: new Date('2026-10-27T13:00:00Z'),
    feeds: ['fixture'], parseFeed: async () => ({ title: 'Ripley Main Street', items: [] }),
    imageDownload: async () => { throw new Error('Unexpected image download'); },
    log: { log: text => messages.push(text), warn: text => messages.push(text), error: text => messages.push(text) }, messages };
}
const article = title => ({ title, excerpt: 'Supported source facts.', article: 'Supported source facts.' });
const changed = (id, content) => ({ ...repeat, guid: id, link: `https://www.facebook.com/875713894854316/posts/${id}`, content });

test('reviewed same-event repeat with another source GUID reconciles before rewriting', async t => {
  const options = await setup(t);
  const original = await fs.readFile(path.join(options.blogDir, records[0].publishedFile));
  const liveIdentity = { ...repeat, guid: 'different-guid', link: 'https://www.facebook.com/875713894854316/posts/99999' };
  const result = await processFeeds({ ...options, parseFeed: async () => ({ items: [liveIdentity] }),
    rewrite: async () => { throw new Error('Duplicate must not be rewritten'); } });
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.created.length, 0);
  assert.equal(result.held.length, 0);
  assert.deepEqual(options.processedItems, ['different-guid']);
  assert.deepEqual(await fs.readFile(path.join(options.blogDir, records[0].publishedFile)), original);
  assert.deepEqual(await fs.readdir(options.blogDir), [records[0].publishedFile]);
  assert.ok(options.messages.some(text => text.includes('DUPLICATE')));
});

test('similarly titled events on different dates, venues or publishers are not deduplicated', async t => {
  const options = await setup(t);
  const variants = [
    changed('200', repeat.content.replace('October 30th', 'November 6th')),
    changed('201', repeat.content.replace('The Cut-Off', 'Community Center')),
    { ...repeat, link: 'https://www.facebook.com/another-page/posts/202' },
    { ...repeat, pubDate: 'Tue, 26 Oct 2027 17:30:01 +0000' }
  ];
  for (const item of variants) assert.equal(reviewedDuplicate(item, options.blogDir, records), null);
  const result = await processFeeds({ ...options, parseFeed: async () => ({ items: variants.slice(0, 3) }),
    imageDownload: async () => null, rewrite: async item => article(`Pet Costume Contest — ${item.link.split('/').pop()}`) });
  assert.equal(result.created.length, 3);
  assert.equal(result.duplicates.length, 0);
});

test('material updates remain distinct; an ambiguous colliding update stays held', async t => {
  const options = await setup(t);
  const updates = [changed('300', repeat.content.replace('7:00 PM', '8:00 PM')),
    changed('301', repeat.content.replace('$5 registration', '$10 registration'))];
  for (const item of updates) assert.equal(reviewedDuplicate(item, options.blogDir, records), null);
  const result = await processFeeds({ ...options, parseFeed: async () => ({ items: updates }),
    imageDownload: async () => null, rewrite: async item => article(item.guid === '300' ?
      'Spirit of Ripley Pet Costume Contest Moves to 8 PM' : 'Pet Costume Contest at Spirit of Ripley Festival') });
  assert.equal(result.created.length, 1);
  assert.equal(result.held.length, 1);
  assert.match(result.held[0].reason, /title already exists/);
  assert.deepEqual(options.processedItems, ['300']);
});

test('partial batch holds unsafe or colliding candidates and publishes unrelated valid output', async t => {
  const options = await setup(t);
  const items = [changed('400', 'An unreviewed announcement about the pet costume contest.'),
    changed('401', 'A verified grand opening announcement.'),
    changed('402', 'Unable to generate article: insufficient source material')];
  const result = await processFeeds({ ...options, parseFeed: async () => ({ items }),
    rewrite: async item => article(item.guid === '400' ? 'Pet Costume Contest at Spirit of Ripley Festival' : 'Clothed in Grace Grand Opening') });
  assert.equal(result.created.length, 1);
  assert.equal(result.held.length, 2);
  assert.deepEqual(options.processedItems, ['401']);
  assert.ok(options.messages.some(text => /2 HELD/.test(text)));
  assert.equal((await fs.readdir(options.blogDir)).length, 2);
});

test('new candidates also cannot duplicate each other, including after a generation error', async t => {
  const options = await setup(t);
  const items = [changed('500', 'First source'), changed('501', 'Second source'), changed('502', 'Third source')];
  const result = await processFeeds({ ...options, parseFeed: async () => ({ items }), rewrite: async item => {
    if (item.guid === '500') throw new Error('Generation failed');
    return article('A New Community Event');
  } });
  assert.equal(result.created.length, 1);
  assert.equal(result.held.length, 2);
  assert.deepEqual(options.processedItems, ['501']);
});

test('changed published anchors fail closed and preserve existing bytes, titles and URLs', async t => {
  const options = await setup(t);
  const file = path.join(options.blogDir, records[0].publishedFile);
  await fs.appendFile(file, '\nEditorial correction.\n');
  const before = await fs.readFile(file);
  const result = await processFeeds({ ...options, parseFeed: async () => ({ items: [repeat] }) });
  assert.match(result.held[0].reason, /anchor changed/);
  assert.equal(result.duplicates.length, 0);
  assert.deepEqual(options.processedItems, []);
  assert.deepEqual(await fs.readFile(file), before);
  assert.equal(pageTitle({ title: 'Pet Costume Contest at Spirit of Ripley Festival' }, 'RCTV19'), 'Pet Costume Contest at Spirit of Ripley Festival | RCTV19');
});

test('complete source fingerprint retains new facts and changed media, ignores GUID and expiring media queries', () => {
  assert.equal(sourceFingerprint(repeat), records[0].fingerprints[0]);
  assert.equal(sourceFingerprint({ ...repeat, guid: 'other', content: repeat.content.replace('.jpg"', '.jpg?expires=1"') }), sourceFingerprint(repeat));
  for (const content of [repeat.content + '<p>Registration closes Thursday.</p>', repeat.content.replace('_n.jpg', '_new.jpg'),
    repeat.content.replace('leash', 'harness'), repeat.content.replace('2026', '2027') + ' Event year: 2027.']) {
    assert.notEqual(sourceFingerprint({ ...repeat, content }), sourceFingerprint(repeat));
  }
});
