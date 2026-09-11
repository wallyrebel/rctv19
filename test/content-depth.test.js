const test = require('node:test');
const assert = require('node:assert');
const { insufficientSource, sourceWordCount } = require('../scripts/content-filter');
const { bodyWordCount } = require('../scripts/word-count');
const { generateMarkdown } = require('../scripts/post-output');

const words = n => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

test('a one-line social post is too thin to report', () => {
  const item = { title: 'Movie night', description: 'Movie night at The Cut-Off this Friday. See you there!' };
  assert.equal(insufficientSource(item), true);
});

test('a full announcement carries enough detail to report', () => {
  const item = { title: 'Movie night', description: `<p>${words(120)}</p>` };
  assert.equal(insufficientSource(item), false);
});

test('source word count ignores markup and entities', () => {
  const item = { content: '<div class="post"><p>one two three</p>&nbsp;<img src="x.jpg"></div>' };
  assert.equal(sourceWordCount(item), 3);
});

test('body word count ignores front matter, markup and link targets', () => {
  const raw = [
    '---',
    'title: "Example"',
    'excerpt: "an excerpt that should not count toward the body"',
    '---',
    '',
    '## Heading here',
    '',
    '![alt text](/assets/img/photo.jpg)',
    '',
    'Four real body words [link](https://example.com/a/very/long/url/that/should/not/count).'
  ].join('\n');
  // "Heading here" + "Four real body words" + "link"
  assert.equal(bodyWordCount(raw), 7);
});

test('a stub is refused rather than published as its own page', () => {
  assert.throws(() => generateMarkdown(
    { title: 'Brief', excerpt: 'A brief note.', article: words(80) },
    null,
    new Date('2026-09-11'),
    '/blog/brief/index.html',
    { url: 'https://example.com/brief', name: 'Example' }
  ), /stub/i);
});

test('a substantive article is published', () => {
  const markdown = generateMarkdown(
    { title: 'Real story', excerpt: 'A real story.', article: words(200) },
    null,
    new Date('2026-09-11'),
    '/blog/real-story/index.html',
    { url: 'https://example.com/real', name: 'Example' }
  );
  assert.match(markdown, /aiAssisted: true/);
  assert.match(markdown, /sourceUrl: "https:\/\/example\.com\/real"/);
});
