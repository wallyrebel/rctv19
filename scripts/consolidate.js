// Consolidates short aggregated posts into weekly roundups.
//
// A 200-word rewrite of someone else's announcement does not earn its own
// indexed page. Grouped by topic and week it becomes a roundup that is worth
// reading and worth linking to. Source wording is preserved verbatim so that
// consolidation cannot introduce a factual error; only the packaging changes.
//
//   node scripts/consolidate.js          # plan only, writes nothing
//   node scripts/consolidate.js --apply  # write roundups, remove merged sources
const fs = require('node:fs');
const path = require('node:path');
const { bodyWordCount } = require('./word-count');
const { optimizedImage } = require('./image-assets');

const escapeAttr = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const BLOG_DIR = path.join(__dirname, '../src/blog');
const REDIRECTS = path.join(__dirname, '../src/_redirects');

// Posts at or above this stand on their own; below it they are roundup material.
const KEEP_STANDALONE_WORDS = 250;
// A roundup needs more than one item to be a roundup.
const MIN_GROUP = 2;

const FAMILIES = [
  {
    id: 'sports',
    label: 'Tippah County Sports Roundup',
    slug: 'tippah-county-sports-roundup',
    blurb: week => `High school and college sports from Tippah County and Blue Mountain Christian, ${week}.`,
    match: text => /\b(volleyball|football|soccer|softball|basketball|golf|tigers|cougars|toppers|eagles|wildcats|bulldogs|pick-six|matchup|tournament|district|ssac|naia|athletic|game|match|season|coach)\b/i.test(text)
  },
  {
    id: 'burnside',
    label: 'Burnside Music Fest',
    slug: 'burnside-music-fest-coverage',
    blurb: week => `Coverage of the 2026 Burnside Music Fest in downtown Ripley, ${week}.`,
    match: text => /burnside|music fest|music festival/i.test(text)
  },
  {
    id: 'community',
    label: 'This Week in Ripley',
    slug: 'this-week-in-ripley',
    blurb: week => `Community news, events and local business from Ripley and Tippah County, ${week}.`,
    match: () => true
  }
];

function parse(file) {
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^".*"$/.test(value)) { try { value = JSON.parse(value); } catch {} }
    fm[kv[1]] = value;
  }
  return { file, fm, body: m[2].trim(), words: bodyWordCount(raw) };
}

function isoWeekStart(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
  return d;
}

const fmtDay = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
const fmtFull = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function weekLabel(start) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const span = start.getUTCMonth() === end.getUTCMonth()
    ? `${fmtDay(start)}–${end.getUTCDate()}`
    : `${fmtDay(start)} – ${fmtDay(end)}`;
  return `${span}, ${end.getUTCFullYear()}`;
}

// Each source keeps its own words; only heading depth changes so the roundup
// has a single heading hierarchy.
function sectionBody(body) {
  return body
    .replace(/^\s*#\s+[^\n]*\n+/, '')       // drop the source's own headline
    .replace(/^(#{1,5})\s/gm, '#$1 ')       // demote everything one level
    .trim();
}

function familyFor(post) {
  const text = `${post.fm.title || ''} ${post.file} ${post.body.slice(0, 400)}`;
  return FAMILIES.find(f => f.match(text));
}

function plan() {
  const posts = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md')).map(parse).filter(Boolean);
  const keep = [];
  const groups = new Map();

  for (const post of posts) {
    if (post.words >= KEEP_STANDALONE_WORDS || post.fm.pinned === 'true' || !post.fm.aiAssisted) {
      keep.push(post);
      continue;
    }
    const family = familyFor(post);
    const start = isoWeekStart(new Date(post.fm.date));
    const key = `${family.id}|${start.toISOString().slice(0, 10)}`;
    if (!groups.has(key)) groups.set(key, { family, start, posts: [] });
    groups.get(key).posts.push(post);
  }

  const roundups = [];
  for (const group of groups.values()) {
    if (group.posts.length < MIN_GROUP) { keep.push(...group.posts); continue; }
    group.posts.sort((a, b) => String(a.fm.date).localeCompare(String(b.fm.date)) || a.file.localeCompare(b.file));
    const day = group.start.toISOString().slice(0, 10);
    roundups.push({
      ...group,
      slug: `${day}-${group.family.slug}`,
      title: `${group.family.label}: ${weekLabel(group.start)}`,
      words: group.posts.reduce((sum, p) => sum + p.words, 0)
    });
  }
  roundups.sort((a, b) => a.slug.localeCompare(b.slug));
  return { keep, roundups };
}

function render(roundup) {
  const week = weekLabel(roundup.start);
  const latest = roundup.posts[roundup.posts.length - 1].fm.date;
  const image = (roundup.posts.find(p => p.fm.featuredImage) || {}).fm;
  const front = {
    title: roundup.title,
    date: latest,
    excerpt: `${roundup.family.blurb(week)} ${roundup.posts.length} stories.`,
    permalink: `/blog/${roundup.slug}/index.html`,
    aiAssisted: true
  };
  const lines = ['---'];
  for (const [key, value] of Object.entries(front)) {
    lines.push(`${key}: ${key === 'date' || key === 'aiAssisted' ? value : JSON.stringify(value)}`);
  }
  if (image) lines.push(`featuredImage: ${JSON.stringify(image.featuredImage)}`);
  lines.push('---', '');
  lines.push(roundup.family.blurb(week), '');
  if (roundup.posts.length >= 4) {
    lines.push('**In this roundup:**', '');
    for (const post of roundup.posts) lines.push(`- ${post.fm.title}`);
    lines.push('');
  }
  for (const post of roundup.posts) {
    lines.push(`## ${post.fm.title}`, '', `*${fmtFull(new Date(post.fm.date))}*`, '');
    if (post.fm.featuredImage) {
      const src = optimizedImage(post.fm.featuredImage, 960);
      const small = optimizedImage(post.fm.featuredImage, 480);
      const srcset = small === src ? '' : ` srcset="${small} 480w, ${src} 960w" sizes="(max-width: 960px) 100vw, 900px"`;
      lines.push(`<img src="${src}"${srcset} alt="${escapeAttr(post.fm.title)}" loading="lazy">`, '');
    }
    lines.push(sectionBody(post.body), '');
    // Attribution belongs with the item it describes, not with the roundup.
    if (post.fm.sourceUrl) {
      lines.push(`Source: [${post.fm.sourceName || 'Original report'}](${post.fm.sourceUrl})`, '');
    }
  }
  return lines.join('\n');
}

function permalinkOf(post) {
  if (post.fm.permalink) return String(post.fm.permalink).replace(/index\.html$/, '');
  return `/blog/${post.file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')}/`;
}

function apply(result) {
  const redirects = [];
  for (const roundup of result.roundups) {
    fs.writeFileSync(path.join(BLOG_DIR, `${roundup.slug}.md`), render(roundup));
    for (const post of roundup.posts) {
      redirects.push(`${permalinkOf(post)} /blog/${roundup.slug}/ 301`);
      fs.unlinkSync(path.join(BLOG_DIR, post.file));
    }
  }
  const existing = fs.existsSync(REDIRECTS) ? fs.readFileSync(REDIRECTS, 'utf8').trimEnd() + '\n' : '';
  fs.writeFileSync(REDIRECTS, `${existing}# Posts consolidated into weekly roundups\n${redirects.join('\n')}\n`);
  return redirects.length;
}

function main() {
  const result = plan();
  const merged = result.roundups.reduce((n, r) => n + r.posts.length, 0);
  console.log(`Standalone posts kept: ${result.keep.length}`);
  console.log(`Roundups created:      ${result.roundups.length}`);
  console.log(`Posts merged:          ${merged}`);
  console.log(`Pages after:           ${result.keep.length + result.roundups.length} (from ${result.keep.length + merged})\n`);
  for (const roundup of result.roundups) {
    console.log(`${String(roundup.words).padStart(5)} w  ${String(roundup.posts.length).padStart(2)} posts  ${roundup.title}`);
    if (process.argv.includes('--verbose')) for (const p of roundup.posts) console.log(`               - ${p.fm.title}`);
  }
  if (process.argv.includes('--apply')) console.log(`\nWrote ${result.roundups.length} roundups and ${apply(result)} redirects.`);
  else console.log('\nPlan only. Re-run with --apply to write changes.');
}

module.exports = { plan, render, apply, isoWeekStart, weekLabel, sectionBody, permalinkOf };
if (require.main === module) main();
