const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const cheerio = require('cheerio');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = value => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();

// Match a complete reviewed source snapshot, never overlapping headline words.
// Include media paths; ignore only expiring query strings on media URLs.
function sourceFingerprint(item) {
  const $ = cheerio.load(item['content:encoded'] || item.content || item.description || '');
  const media = $('img, iframe').map((_, el) => {
    const url = new URL($(el).attr('src'));
    return url.origin + url.pathname;
  }).get();
  const enclosure = item.enclosure?.url || item['media:content']?.$?.url;
  if (enclosure) { const url = new URL(enclosure); media.push(url.origin + url.pathname); }
  const links = $('a[href]').map((_, el) => $(el).attr('href')).get().sort();
  $('br').replaceWith(' ');
  return hash(JSON.stringify([normalize(item.title), normalize($.root().text()), [...new Set(media)].sort(), links]));
}

function sourcePublisher(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Source URL must use HTTP or HTTPS');
  const facebook = parsed.hostname.replace(/^www\./, '') === 'facebook.com';
  const page = facebook && parsed.pathname.match(/^\/([^/]+)\/posts\/\d+\/?$/);
  return page ? `facebook.com/${page[1]}` : parsed.origin;
}

function reviewedDuplicate(item, blogDir, records) {
  const publisher = sourcePublisher(item.link);
  const publication = new Date(item.pubDate).getTime();
  const candidates = records.filter(entry => entry.publisher === publisher &&
    publication >= Date.parse(entry.sourceWindow.start) && publication < Date.parse(entry.sourceWindow.end));
  if (!candidates.length) return null;
  const fingerprint = sourceFingerprint(item);
  const record = candidates.find(entry => entry.fingerprints.includes(fingerprint));
  if (!record) return null; // Changed facts/media must receive normal candidate validation.
  const published = fs.readFileSync(path.join(blogDir, record.publishedFile), 'utf8');
  const { data } = matter(published);
  // Git may check out the same reviewed article with CRLF on Windows.
  if (hash(published.replace(/\r\n/g, '\n')) !== record.publishedSha256 || data.sourceUrl !== record.publishedSourceUrl || data.permalink !== record.permalink) {
    throw new Error(`Reviewed event anchor changed: ${record.eventId}; hold for review`);
  }
  return record;
}

// Mirror base.njk's title choice without changing any headline or published file.
function pageTitle(data, shortName) {
  return data.metaTitle || (data.title ? data.title + (data.title.length <= 54 ? ` | ${shortName}` : '') : '');
}

function existingTitles(srcDir, shortName) {
  const titles = new Set();
  for (const name of fs.readdirSync(srcDir, { recursive: true })) {
    if (!/\.(md|njk)$/.test(name)) continue;
    const text = fs.readFileSync(path.join(srcDir, name), 'utf8');
    if (!text.startsWith('---')) continue;
    const { data } = matter(text);
    const title = pageTitle(data, shortName);
    if (title) titles.add(title);
  }
  return titles;
}

module.exports = { sourceFingerprint, reviewedDuplicate, existingTitles, pageTitle };
