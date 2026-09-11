const crypto = require('crypto');
const slugify = require('slugify');
const fs = require('fs').promises;
const { unavailableContent } = require('./content-filter');
const { bodyWordCount } = require('./word-count');

// Below this the page is a stub rather than a story, so it is not worth
// publishing as its own indexed page.
const MIN_ARTICLE_WORDS = 150;

function postOutput(title, date, feedUrl, guid) {
  const day = date.toISOString().split('T')[0];
  const slug = slugify(title, { lower: true, strict: true }).substring(0, 50) || 'article';
  const id = crypto.createHash('sha256').update(JSON.stringify([feedUrl, guid])).digest('hex');
  const name = `${day}-${slug}-${id}`;
  return { fileName: `${name}.md`, permalink: `/blog/${name}/index.html` };
}

function generateMarkdown(rewritten, localImgPath, date, permalink, source = {}) {
  if (![rewritten.title, rewritten.excerpt, rewritten.article].every(value => typeof value === 'string' && value.trim()) ||
      unavailableContent({title: rewritten.title, content: rewritten.article}) ||
      unavailableContent({title: rewritten.excerpt, content: rewritten.article})) {
    throw new Error('Refusing to publish incomplete or failed article generation');
  }
  if (bodyWordCount(rewritten.article) < MIN_ARTICLE_WORDS) {
    throw new Error(`Refusing to publish a ${bodyWordCount(rewritten.article)}-word stub; minimum is ${MIN_ARTICLE_WORDS} words`);
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

module.exports = { postOutput, generateMarkdown, writeNewPost, MIN_ARTICLE_WORDS };
