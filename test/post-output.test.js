const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Eleventy = require('@11ty/eleventy');
const { postOutput, generateMarkdown, writeNewPost } = require('../scripts/post-output');

test('repeated and truncated headlines build to distinct pages', async t => {
  const root = await fs.mkdtemp(path.join(process.cwd(), 'rctv-posts-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, 'input');
  const outputDir = path.join(root, 'output');
  await fs.mkdir(input);
  const defaults = JSON.parse(await fs.readFile(path.join(__dirname, '../src/blog/blog.json'), 'utf8'));
  delete defaults.layout;
  await fs.writeFile(path.join(input, 'input.json'), JSON.stringify(defaults));
  const title = 'Tippah County Volleyball Teams Take Center Stage in ';
  const cases = [
    [title + 'Monday matches', '2026-08-10', 'feed-a', '1'],
    [title + 'Tuesday matches', '2026-08-11', 'feed-a', '2'],
    [title + 'Monday matches', '2026-08-10', 'feed-a', '3'],
    [title + 'Monday matches', '2026-08-10', 'feed-b', '1'],
    ['!!!', '2026-08-10', 'feed-a', '4'],
  ];
  const outputs = [];
  for (const [headline, day, feed, guid] of cases) {
    const date = new Date(day);
    const output = postOutput(headline, date, feed, guid);
    const article = { title: headline, excerpt: 'Quotes " and backslashes \\ and\na new line', article: 'Article body.' };
    await writeNewPost(path.join(input, output.fileName), generateMarkdown(article, null, date, output.permalink));
    outputs.push(output);
  }
  assert.equal(new Set(outputs.map(o => o.permalink)).size, cases.length);
  assert.deepEqual(postOutput(...[cases[0][0], new Date(cases[0][1]), ...cases[0].slice(2)]), outputs[0]);
  const eleventy = new Eleventy(path.relative(process.cwd(), input).split(path.sep).join('/'), outputDir, { configPath: false });
  await eleventy.write();
  for (const output of outputs) {
    const html = await fs.readFile(path.join(outputDir, output.permalink.slice(1)), 'utf8');
    assert.match(html, /Article body/);
  }
});

test('an existing article cannot be overwritten', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rctv-write-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'article.md');
  await writeNewPost(file, 'original');
  await assert.rejects(writeNewPost(file, 'replacement'), { code: 'EEXIST' });
  assert.equal(await fs.readFile(file, 'utf8'), 'original');
});
