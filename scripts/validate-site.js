const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve('_site');
const ads = require('../src/_data/ads.json');
const files = fs.readdirSync(root, { recursive: true }).filter(f => f.endsWith('.html') && !f.startsWith('admin'));
const errors = [];
const titles = new Set();
let articles = 0;
for (const file of files) {
  const html = fs.readFileSync(path.join(root,file),'utf8');
  try {
    assert.equal((html.match(/<h1\b/g)||[]).length,1,'Exactly one main heading');
    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    assert.ok(title,'Page title');
    assert.ok(!titles.has(title),'Unique page title'); titles.add(title);
    assert.match(html, /<meta name="description" content="[^"]+"/,'Description');
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
    if (!ads.adsenseEnabled) assert.doesNotMatch(html, /<script[^>]+pagead2\.googlesyndication/,'Ad serving is disabled');
  } catch(e) { errors.push(`${file}: ${e.message}`); }
}
assert.equal(fs.readFileSync(path.join(root,'ads.txt'),'utf8').trim(),`google.com, ${ads.adsensePublisherId.replace('ca-pub-','pub-')}, DIRECT, f08c47fec0942fa0`);
assert.match(fs.readFileSync(path.join(root,'404.html'),'utf8'),/noindex, follow/);
assert.ok(!fs.existsSync(path.join(root,'blog/unable-to-generate-article-insufficient-content-da/index.html')));
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size,urls.length,'Sitemap URLs must be unique');
assert.ok(urls.includes('https://rctv19.com/blog/page/2/'),'Paginated archives in sitemap');
if(errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log(`Validated ${files.length} HTML pages, ${articles} article schemas, internal resources, sitemap and ad safeguards.`);
