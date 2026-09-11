const test = require('node:test');
const assert = require('node:assert/strict');
const { eligibility, prepare } = require('../scripts/import-browser-obituaries');
const now = new Date('2026-09-11T17:00:00Z');
test('24-hour filter rejects stale, future, missing and ambiguous dates', () => {
  assert.ok(eligibility({published:'2026-09-10T17:00:00Z'}, now));
  assert.equal(eligibility({published:'2026-09-10T16:59:59Z'}, now), null);
  assert.equal(eligibility({published:'2026-09-11T17:00:01Z'}, now), null);
  assert.equal(eligibility({published:'2026-09-10'}, now), null);
  assert.equal(eligibility({published:'2026-09-11T10:00:00'}, now), null);
  assert.equal(eligibility({}, now), null);
  assert.equal(eligibility({deathDate:'2026-09-11'}, now).basis, 'death');
  assert.equal(eligibility({deathDate:'2026-09-10'}, now), null);
});
test('browser capture preserves punctuation and prevents template/HTML interpretation', () => {
  const record={sourceId:'ripley',url:'https://www.ripleyfuneralhome.com/obituary/Test-Person',name:'Test Person',published:'2026-09-11T10:00:00Z',complete:true,paragraphs:['A “quote”—and an apostrophe’s.  Two spaces.','{{ unchanged }} <script> & *literal*']};
  const item=prepare(record,now);
  const rendered=require('markdown-it')().render(item.body);
  assert.match(item.body,/A “quote”—and an apostrophe’s\.  Two spaces\./);
  assert.match(item.body,/&lt;script&gt; &amp; \*literal\*/);
  assert.equal(item.front.templateEngineOverride,'md');
  assert.equal(prepare({...record,published:'2026-09-01T10:00:00Z'},now),null);
  assert.throws(()=>prepare({...record,complete:false},now));
  assert.throws(()=>prepare({...record,url:'https://example.com/obituary/Test-Person'},now));
  assert.notEqual(item.id,prepare({...record,url:'https://www.ripleyfuneralhome.com/obituary/Test-Person2'},now).id);
});
