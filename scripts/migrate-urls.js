// Moves published articles onto clean, readable URLs and records a permanent
// redirect from every old URL so search rankings and existing links follow.
//
//   node scripts/migrate-urls.js            # report only, changes nothing
//   node scripts/migrate-urls.js --hashed   # only URLs carrying a content hash
//   node scripts/migrate-urls.js --all      # every article
const fs = require('node:fs');
const path = require('node:path');
const slugify = require('slugify');
const { articleSlug } = require('./post-output');

const BLOG_DIR = path.join(__dirname, '../src/blog');
const REDIRECTS = path.join(__dirname, '../src/_data/redirects.json');

// The importer used to append a 64-character SHA of the feed item to the URL.
const HASHED = /-[0-9a-f]{64}$/;

function currentSlug(name, front) {
  const permalink = (front.match(/^permalink:\s*"?([^"\n]+)"?\s*$/m) || [])[1];
  if (permalink) return (permalink.match(/\/blog\/([^/]+)\//) || [])[1];
  return name.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

// Redirecting a URL costs a little ranking signal, so only URLs that are
// actually damaged are worth moving. A slug that stops cleanly on a word is
// left alone even when it is shorter than one generated today.
function needsMove(slug, title) {
  if (HASHED.test(slug) || /^\d{4}-\d{2}-\d{2}-/.test(slug)) return true;
  const full = slugify(String(title || ''), { lower: true, strict: true });
  if (!full || slug === full) return false;
  return !full.startsWith(`${slug}-`);
}

function plan(scope) {
  const taken = new Set();
  const moves = [];
  const files = fs.readdirSync(BLOG_DIR).filter(name => name.endsWith('.md')).sort();

  // Slugs that are staying put are reserved first, so a rename can never land on one.
  const entries = files.map(name => {
    const source = fs.readFileSync(path.join(BLOG_DIR, name), 'utf8');
    const front = source.split('---')[1] || '';
    const title = (front.match(/^title:\s*(.*)$/m) || [])[1] || '';
    const from = currentSlug(name, front);
    const headline = title.trim().replace(/^["']|["']$/g, '');
    const dated = HASHED.test(from) || /^\d{4}-\d{2}-\d{2}-/.test(from);
    const eligible = scope === 'hashed' ? dated : needsMove(from, headline);
    return { name, source, title: headline, from, eligible };
  });
  for (const entry of entries) if (!entry.eligible) taken.add(entry.from);

  for (const entry of entries) {
    if (!entry.eligible) continue;
    let to = articleSlug(entry.title);
    if (to !== entry.from) {
      let suffix = 2;
      const base = to;
      while (taken.has(to)) to = `${base}-${suffix++}`;
    }
    taken.add(to);
    if (to !== entry.from) moves.push({ ...entry, to });
  }
  return moves;
}

function apply(moves) {
  for (const move of moves) {
    const permalink = `/blog/${move.to}/index.html`;
    const updated = move.source.match(/^permalink:\s*.*$/m)
      ? move.source.replace(/^permalink:\s*.*$/m, `permalink: ${JSON.stringify(permalink)}`)
      : move.source.replace(/^(---\r?\n)/, `$1permalink: ${JSON.stringify(permalink)}\n`);
    fs.writeFileSync(path.join(BLOG_DIR, move.name), updated);
  }

  const existing = JSON.parse(fs.readFileSync(REDIRECTS, 'utf8'));
  const seen = new Set(existing.map(entry => entry.from));
  for (const move of moves) {
    const from = `/blog/${move.from}/`;
    if (seen.has(from)) continue;
    // An earlier redirect pointing at a URL that just moved again is re-aimed,
    // so no reader or crawler is ever sent through a chain.
    for (const entry of existing) if (entry.to === from) entry.to = `/blog/${move.to}/`;
    existing.push({ from, to: `/blog/${move.to}/` });
    seen.add(from);
  }
  fs.writeFileSync(REDIRECTS, `${JSON.stringify(existing, null, 2)}\n`);
  return existing.length;
}

function main(argv) {
  const scope = argv.includes('--all') ? 'all' : argv.includes('--hashed') ? 'hashed' : null;
  const moves = plan(scope || 'all');
  if (!scope) {
    console.log(`${moves.length} articles would move to a cleaner URL. Re-run with --hashed or --all to apply.\n`);
    for (const move of moves.slice(0, 10)) console.log(`  /blog/${move.from}/\n    -> /blog/${move.to}/`);
    if (moves.length > 10) console.log(`  ...and ${moves.length - 10} more.`);
    return;
  }
  const total = apply(moves);
  console.log(`Moved ${moves.length} articles; ${total} redirects are now in place.`);
}

module.exports = { plan, apply, articleSlug };
if (require.main === module) main(process.argv.slice(2));
