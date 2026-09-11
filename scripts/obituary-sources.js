// Obituary sources and parsing.
//
// Obituaries are never rewritten. A name, a date, a survivor's relationship or
// a service time that has been paraphrased is an error printed under a family's
// worst week, so the text is republished exactly as the funeral home wrote it,
// with attribution and a link back. No model is involved anywhere in this file.

const SOURCES = [
  {
    id: 'mcbride',
    name: 'McBride Funeral Home',
    home: 'https://www.mcbridefuneralhome.com',
    listing: 'https://www.mcbridefuneralhome.com/obituaries/',
    // robots.txt permits /obituaries/; it disallows the search API, which we never call.
    platform: 'funeralOne',
    obituaryPath: /^\/(?:m\/)?obituaries\/[a-z0-9][a-z0-9-]*\/$/i
  },
  {
    id: 'ripley',
    name: 'Ripley Funeral and Cremation Services',
    home: 'https://www.ripleyfuneralhome.com',
    listing: 'https://www.ripleyfuneralhome.com/listings',
    platform: 'CFS',
    obituaryPath: /^\/obituary\/[A-Za-z0-9][A-Za-z0-9-]*$/
  },
  {
    id: 'foster',
    name: 'Foster & Son Funeral Home',
    home: 'https://www.fosterandsonfuneralhome.com',
    listing: 'https://www.fosterandsonfuneralhome.com/listings',
    platform: 'CFS',
    obituaryPath: /^\/obituary\/[A-Za-z0-9][A-Za-z0-9-]*$/
  }
];

const USER_AGENT = 'RCTV19-ObitBot/1.0 (+https://rctv19.com/contact/; rctv19@gmail.com)';

// These sites sit behind bot protection. When it answers, that is a "no" to be
// reported and surfaced, never a puzzle to solve: the fix is the funeral home
// allowing our crawler or sending us a feed, not a cleverer request.
function isBotChallenge(status, body = '') {
  return status === 403 || status === 503 ||
    /just a moment\.\.\.|challenge-platform|cf-browser-verification|you have been blocked|enable javascript and cookies to continue/i.test(body);
}

const decode = text => String(text)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#0?39;|&apos;|&rsquo;/gi, "'")
  .replace(/&lsquo;/gi, "'")
  .replace(/&(?:ldquo|rdquo);/gi, '"')
  .replace(/&#8211;|&ndash;/gi, '–')
  .replace(/&#8212;|&mdash;/gi, '—')
  .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, dec) => String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10)))
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const meta = (html, property) => {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i');
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
  const match = html.match(pattern) || html.match(reversed);
  return match ? decode(match[1]) : '';
};

function jsonLd(html) {
  const blocks = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      blocks.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch { /* a malformed block is not worth failing the run over */ }
  }
  return blocks;
}

// Finds obituary links on a listing page. Deliberately conservative: a link has
// to match the source's own obituary URL shape to be followed.
function listingLinks(html, source) {
  const found = new Set();
  for (const match of html.matchAll(/href=["']([^"'#?]+)["']/gi)) {
    let href = match[1];
    try {
      const url = new URL(href, source.home);
      if (url.origin !== new URL(source.home).origin) continue;
      const pathname = url.pathname.endsWith('/') || /\/obituary\//.test(url.pathname) ? url.pathname : `${url.pathname}/`;
      if (source.obituaryPath.test(pathname) || source.obituaryPath.test(url.pathname)) {
        found.add(`${url.origin}${url.pathname}`);
      }
    } catch { /* not a usable URL */ }
  }
  return [...found];
}

const NAME_NOISE = /\s*(?:\||–|—|-)\s*(?:obituary|obituaries|tribute)\b.*$|^\s*obituary (?:of|for)\s+/i;

function cleanName(value = '') {
  return decode(value).replace(NAME_NOISE, '').replace(/\s*\|.*$/, '').trim();
}

// Pulls the obituary out of a page without interpreting it. Structured data is
// preferred; the meta description is a labelled fallback, never a substitute
// for the full text, so a partial extraction is reported rather than published.
function parseObituary(html, url, source) {
  const person = jsonLd(html).find(node => /Person|NewsArticle|Article/i.test(String(node['@type'] || '')));
  const name = cleanName(
    (person && (person.name || person.headline)) ||
    meta(html, 'og:title') ||
    (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] ||
    ''
  );

  let body = '';
  if (person && typeof person.articleBody === 'string') body = decode(person.articleBody);
  if (!body) {
    const container = html.match(/<div[^>]+(?:class|id)=["'][^"']*(?:obituary-text|obit-text|obituary-body|tribute-text|obituaryBody)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (container) body = decode(container[1]);
  }

  const published = (person && (person.datePublished || person.dateCreated)) || meta(html, 'article:published_time') || '';
  const death = (person && person.deathDate) || '';
  const birth = (person && person.birthDate) || '';
  const image = (person && (typeof person.image === 'string' ? person.image : person.image && person.image.url)) || meta(html, 'og:image') || '';

  return {
    sourceId: source.id,
    sourceName: source.name,
    url,
    name,
    body,
    summary: meta(html, 'og:description'),
    published: String(published).slice(0, 10),
    deathDate: String(death).slice(0, 10),
    birthDate: String(birth).slice(0, 10),
    image,
    // The caller decides what to do with an incomplete record; it never guesses.
    complete: Boolean(name && body && body.split(/\s+/).length >= 40)
  };
}

module.exports = { SOURCES, USER_AGENT, isBotChallenge, parseObituary, listingLinks, decode, meta, jsonLd, cleanName };
