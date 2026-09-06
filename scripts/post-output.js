const crypto = require('crypto');
const slugify = require('slugify');
const fs = require('fs').promises;

function postOutput(title, date, feedUrl, guid) {
  const day = date.toISOString().split('T')[0];
  const slug = slugify(title, { lower: true, strict: true }).substring(0, 50) || 'article';
  const id = crypto.createHash('sha256').update(JSON.stringify([feedUrl, guid])).digest('hex');
  const name = `${day}-${slug}-${id}`;
  return { fileName: `${name}.md`, permalink: `/blog/${name}/index.html` };
}

function generateMarkdown(rewritten, localImgPath, date, permalink) {
  // JSON strings are valid YAML scalars, including quotes, backslashes and newlines.
  let frontmatter = `---\ntitle: ${JSON.stringify(rewritten.title)}\ndate: ${date.toISOString().split('T')[0]}\nexcerpt: ${JSON.stringify(rewritten.excerpt)}\npermalink: ${JSON.stringify(permalink)}\n`;
  if (localImgPath) frontmatter += `featuredImage: ${JSON.stringify(localImgPath)}\n`;
  return `${frontmatter}---\n\n${rewritten.article}\n`;
}

async function writeNewPost(filePath, markdown) {
  // Fail safely instead of silently overwriting a different or previously saved article.
  await fs.writeFile(filePath, markdown, { flag: 'wx' });
}

module.exports = { postOutput, generateMarkdown, writeNewPost };
