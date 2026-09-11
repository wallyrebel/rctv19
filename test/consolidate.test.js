const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isoWeekStart, weekLabel, sectionBody, permalinkOf } = require('../scripts/consolidate');

test('weeks start on Monday regardless of which day a post lands on', () => {
  const monday = '2026-08-24';
  for (const day of ['2026-08-24', '2026-08-27', '2026-08-30']) {
    assert.equal(isoWeekStart(new Date(day)).toISOString().slice(0, 10), monday);
  }
  // Sunday belongs to the week that just ended, not the one starting next day.
  assert.equal(isoWeekStart(new Date('2026-08-31')).toISOString().slice(0, 10), '2026-08-31');
});

test('week labels read naturally within and across months', () => {
  assert.equal(weekLabel(new Date('2026-08-24')), 'August 24–30, 2026');
  assert.equal(weekLabel(new Date('2026-08-31')), 'August 31 – September 6, 2026');
});

test('merged sections drop their own headline and demote inner headings', () => {
  const merged = sectionBody('# Original headline\n\nLead paragraph.\n\n## Inner heading\n\nMore text.');
  assert.doesNotMatch(merged, /^#\s/m, 'no H1 survives, so the page keeps one main heading');
  assert.match(merged, /^### Inner heading$/m);
  assert.match(merged, /Lead paragraph\./);
});

test('redirect sources match the URLs the posts were published at', () => {
  assert.equal(
    permalinkOf({ file: '2026-01-07-ripley-business-garbage-pickup.md', fm: {} }),
    '/blog/ripley-business-garbage-pickup/'
  );
  assert.equal(
    permalinkOf({ file: 'whatever.md', fm: { permalink: '/blog/2026-09-10-story-abc123/index.html' } }),
    '/blog/2026-09-10-story-abc123/'
  );
});

test('every consolidated URL redirects to a roundup that exists', () => {
  const root = path.join(__dirname, '..');
  const lines = fs.readFileSync(path.join(root, 'src/_redirects'), 'utf8')
    .split('\n').filter(line => line && !line.startsWith('#'));
  const sources = new Set();
  for (const line of lines) {
    const [from, to, code] = line.split(/\s+/);
    assert.equal(code, '301', `${from} should be a permanent redirect`);
    assert.ok(!sources.has(from), `${from} is redirected twice`);
    sources.add(from);
    const slug = to.replace(/^\/blog\/|\/$/g, '');
    assert.ok(fs.existsSync(path.join(root, 'src/blog', `${slug}.md`)), `missing roundup for ${to}`);
  }
  assert.ok(lines.length > 0, 'redirects are recorded');
});
