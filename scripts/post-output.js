const crypto = require('crypto');
const slugify = require('slugify');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { unavailableContent } = require('./content-filter');

// Long enough to keep the words a reader would search for, short enough that the
// whole URL still fits in a search result without being elided.
const SLUG_LIMIT = 60;

// Cutting at a hyphen keeps whole words, so a headline never ends up as "...-to-att".
function articleSlug(title) {
  const full = slugify(String(title || ''), { lower: true, strict: true });
  if (!full) return 'article';
  if (full.length <= SLUG_LIMIT) return full;
  const clipped = full.slice(0, SLUG_LIMIT + 1);
  const lastBreak = clipped.lastIndexOf('-');
  return (lastBreak > SLUG_LIMIT / 2 ? clipped.slice(0, lastBreak) : full.slice(0, SLUG_LIMIT)).replace(/-+$/, '');
}

// Every URL already published, so a new headline that collides with an old one
// gets a suffix instead of silently taking over an existing page.
function existingSlugs(blogDir) {
  const slugs = new Set();
  let files = [];
  try {
    files = fsSync.readdirSync(blogDir).filter(name => name.endsWith('.md'));
  } catch {
    return slugs;
  }
  for (const name of files) {
    const front = fsSync.readFileSync(path.join(blogDir, name), 'utf8').split('---')[1] || '';
    const permalink = (front.match(/^permalink:\s*"?([^"\n]+)"?\s*$/m) || [])[1];
    if (permalink) {
      const match = permalink.match(/\/blog\/([^/]+)\//);
      if (match) slugs.add(match[1]);
    } else {
      // Without an explicit permalink, Eleventy builds the URL from the file
      // slug, which is the filename with its leading date stripped.
      slugs.add(name.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
    }
  }
  return slugs;
}

function postOutput(title, date, feedUrl, guid, takenSlugs = new Set()) {
  const day = date.toISOString().split('T')[0];
  const id = crypto.createHash('sha256').update(JSON.stringify([feedUrl, guid])).digest('hex');
  const base = articleSlug(title);
  // The suffix comes from the content hash, so re-running the importer on the
  // same feed item produces the same URL rather than a second copy.
  const slug = takenSlugs.has(base) ? `${base}-${id.slice(0, 6)}` : base;
  return { fileName: `${day}-${base}-${id}.md`, permalink: `/blog/${slug}/index.html`, slug };
}

function generateMarkdown(rewritten, localImgPath, date, permalink, source = {}) {
  if (![rewritten.title, rewritten.excerpt, rewritten.article].every(value => typeof value === 'string' && value.trim()) ||
      unavailableContent({title: rewritten.title, content: rewritten.article}) ||
      unavailableContent({title: rewritten.excerpt, content: rewritten.article})) {
    throw new Error('Refusing to publish incomplete or failed article generation');
  }
  // JSON strings are valid YAML scalars, including quotes, backslashes and newlines.
  let frontmatter = `---\ntitle: ${JSON.stringify(rewritten.title)}\ndate: ${date.toISOString().split('T')[0]}\nexcerpt: ${JSON.stringify(rewritten.excerpt)}\npermalink: ${JSON.stringify(permalink)}\n`;
  if (source.url) {
    const url = new URL(source.url);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Source URL must use HTTP or HTTPS');
    frontmatter += `sourceUrl: ${JSON.stringify(url.href)}\nsourceName: ${JSON.stringify(source.name || url.hostname)}\naiAssisted: true\n`;
  }
  if (localImgPath) frontmatter += `featuredImage: ${JSON.stringify(localImgPath)}\n`;
  return `${frontmatter}---\n\n${rewritten.article}\n`;
}

async function writeNewPost(filePath, markdown) {
  // Fail safely instead of silently overwriting a different or previously saved article.
  await fs.writeFile(filePath, markdown, { flag: 'wx' });
}

module.exports = { postOutput, generateMarkdown, writeNewPost, articleSlug, existingSlugs, SLUG_LIMIT };
