const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// Lengths are counted on the text a reader sees, not on the escaped markup, so
// one apostrophe does not read as the five characters of "&#39;".
const decode = text => String(text).replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, entity =>
  ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[entity.slice(1, -1).toLowerCase()] ??
    String.fromCodePoint(parseInt(entity.slice(entity[1] === 'x' ? 3 : 2, -1), entity[1] === 'x' ? 16 : 10))));

// A search result shows roughly this much before it elides the rest.
const TITLE_LIMIT = 65;
const DESCRIPTION_LIMIT = 160;

function validateSite(outputDir = '_site') {
const root = path.resolve(outputDir);
const ads = require('../src/_data/ads.json');
const files = fs.readdirSync(root, { recursive: true }).filter(f => f.endsWith('.html') && !f.startsWith('admin'));
const errors = [];
const titles = new Set();
const pages = new Set();
// Headlines are editorial and are never trimmed to fit, so an over-long title is
// reported rather than failing the build.
const longTitles = [];
let articles = 0;
for (const file of files) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  pages.add('/' + file.split(path.sep).join('/').replace(/index\.html$/, ''));
  try {
    assert.equal((html.match(/<h1\b/g)||[]).length,1,'Exactly one main heading');
    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const titleText = title ? decode(title) : '';
    assert.ok(title,'Page title');
    assert.ok(!titles.has(title),'Unique page title'); titles.add(title);
    if (titleText.length > TITLE_LIMIT) longTitles.push(file);
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(description,'Description');
    const descriptionText = decode(description);
    assert.ok(descriptionText.length <= DESCRIPTION_LIMIT, `Description is ${descriptionText.length} characters; a search result shows about ${DESCRIPTION_LIMIT}`);
    // Large previews are what carry a local story into Discover and the news carousel.
    assert.match(html, /<meta name="robots" content="[^"]*max-image-preview:large/,'Large image previews enabled');
    assert.match(html, /<link rel="canonical" href="https:\/\/rctv19.com\//,'Canonical');
    for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const data=JSON.parse(match[1]);
      if(data['@type']==='NewsArticle') { articles++; assert.ok(data.headline && data.datePublished && data.author); }
    }
    for(const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const url=decodeURIComponent(match[1].replace(/&amp;/g,'&'));
      let target=path.join(root,url);
      if(fs.existsSync(target) && fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
      assert.ok(fs.existsSync(target),`Missing internal resource: ${url}`);
    }
    for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const candidate of match[1].split(',')) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url.startsWith('/')) assert.ok(fs.existsSync(path.join(root, decodeURIComponent(url))), `Missing responsive image: ${url}`);
      }
    }
    if (!ads.adsenseEnabled) assert.doesNotMatch(html, /<script[^>]+pagead2\.googlesyndication/,'Ad serving is disabled');
  } catch(e) { errors.push(`${file}: ${e.message}`); }
}
assert.equal(fs.readFileSync(path.join(root,'ads.txt'),'utf8').trim(),`google.com, ${ads.adsensePublisherId.replace('ca-pub-','pub-')}, DIRECT, f08c47fec0942fa0`);
assert.match(fs.readFileSync(path.join(root,'404.html'),'utf8'),/noindex, follow/);
assert.ok(!fs.existsSync(path.join(root,'blog/unable-to-generate-article-insufficient-content-da/index.html')));

// A redirect only carries a page's ranking if it lands somewhere real, in one hop,
// and is not shadowed by a page still published at the old address.
const redirects = fs.readFileSync(path.join(root,'_redirects'),'utf8').split(/\r?\n/)
  .map(line => line.trim()).filter(Boolean)
  .map(line => { const [from, to] = line.split(/\s+/); return { from, to }; });
const sources = new Set(redirects.map(entry => entry.from));
for (const { from, to } of redirects) {
  if (!pages.has(to)) errors.push(`_redirects: ${from} points at ${to}, which is not published`);
  if (pages.has(from)) errors.push(`_redirects: ${from} is still a published page, so the redirect never runs`);
  if (sources.has(to)) errors.push(`_redirects: ${from} redirects to ${to}, which redirects again`);
}
assert.equal(new Set(sources).size, redirects.length, 'Each old URL redirects once');

const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size,urls.length,'Sitemap URLs must be unique');
assert.ok(urls.includes('https://rctv19.com/blog/page/2/'),'Paginated archives in sitemap');
assert.ok(urls.includes('https://rctv19.com/topics/'),'Topic index in sitemap');
// A sitemap listing a URL that redirects wastes crawl budget and reports as an error.
for (const url of urls) {
  const relative = url.replace('https://rctv19.com','');
  if (sources.has(relative)) errors.push(`sitemap.xml lists ${relative}, which redirects`);
}
const topicPages = fs.readdirSync(path.join(root,'topics'), { withFileTypes: true }).filter(entry => entry.isDirectory());
assert.ok(topicPages.length >= 5, 'Topic hub pages are built');

if(errors.length) { throw new Error(errors.join('\n')); }
console.log(`Validated ${files.length} HTML pages, ${articles} article schemas, ${topicPages.length} topic hubs, ${redirects.length} redirects, internal resources, sitemap and ad safeguards.`);
if (longTitles.length) {
  console.log(`Note: ${longTitles.length} headlines run past ${TITLE_LIMIT} characters and will be cut short in search results. Add a shorter "metaTitle" to any of these worth tightening, for example ${longTitles[0]}.`);
}
}
module.exports = { validateSite };
if (require.main === module) validateSite(process.argv[2]);
