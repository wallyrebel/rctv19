const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { unavailableContent } = require('../scripts/content-filter');
const { generateMarkdown } = require('../scripts/post-output');

test('rejects generation failures in either the headline or body', () => {
  for (const text of [
    'Unable to Generate Article: Insufficient Content Data',
    'I am unable to write a comprehensive article from this source.',
    "I can't generate an article without the source.",
    'Could not generate article',
    'Please provide the actual text content or transcript.',
    '## Content Unavailable\nThe feed contains no usable story.'
  ]) {
    assert.equal(unavailableContent({title: text, content: 'Source text'}), true, text);
    assert.equal(unavailableContent({title: 'Community update', content: text}), true, text);
  }
  assert.equal(unavailableContent({title:'Team unable to score in final quarter', content:'The local team lost the game.'}), false);
});

test('published article files cannot contain a generation failure', () => {
  const dir = path.join(__dirname, '../src/blog');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(dir,file), 'utf8');
    const title = text.match(/^title:\s*["']?(.*)/m)?.[1] || '';
    const body = text.split(/^---\s*$/m).slice(2).join('\n');
    assert.equal(unavailableContent({title,content:body}),false,file);
  }
});

test('new feed articles retain source attribution and reject unsafe source protocols', () => {
  const article = {title:'Local news',excerpt:'Summary',article:`Story body. ${Array.from({length:160},(_,i)=>`word${i}`).join(' ')}`};
  const date = new Date('2026-09-08');
  assert.match(generateMarkdown(article,null,date,'/blog/test/',{url:'https://example.com/story',name:'Source'}), /sourceUrl: "https:\/\/example.com\/story"/);
  assert.throws(()=>generateMarkdown(article,null,date,'/blog/test/',{url:'javascript:alert(1)'}), /HTTP or HTTPS/);
  assert.throws(()=>generateMarkdown({...article,title:'Unable to generate article'},null,date,'/blog/test/'), /Refusing to publish/);
  assert.throws(()=>generateMarkdown({...article,article:''},null,date,'/blog/test/'), /Refusing to publish/);
});
