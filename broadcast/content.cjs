const { load } = require('cheerio/slim');
const text = html => load(String(html || '')).text().replace(/\s+/g, ' ').trim();
const absolute = value => value ? new URL(value, 'https://rctv19.com').href : null;

// Export existing published content and provenance; do not generate or rewrite notices.
function broadcastContent(collections) {
  return {
    generatedAt: new Date().toISOString(),
    stories: (collections.posts || []).slice(0, 60).map(p => ({
      id: p.url, title: text(p.data.title), url: absolute(p.url),
      originalUrl: p.data.sourceUrl || absolute(p.url), source: 'RCTV19',
      image: absolute(p.data.featuredImage), publishedAt: p.date.toISOString(),
      excerpt: text(p.data.excerpt),
    })),
    obituaries: (collections.obituaries || []).slice(0, 100).map(p => {
      const $ = load(p.templateContent || '');
      const paragraphs = $('p').map((_, el) => text($(el).html())).get();
      const services = paragraphs.filter(s => /\b(visitation|funeral service|services will|service will|graveside|arrangements are|arrangements will|memorial service|celebration of life|burial will)\b/i.test(s));
      return {
        id: p.url, name: text(p.data.title), url: absolute(p.url),
        publishedAt: p.date.toISOString(), image: absolute(p.data.featuredImage),
        funeralHome: text(p.data.funeralHome), birthDate: p.data.birthDate || null,
        deathDate: p.data.deathDate || null, services,
      };
    }),
  };
}
module.exports = { broadcastContent };
