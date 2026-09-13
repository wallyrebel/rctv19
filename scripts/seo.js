// Google renders roughly 155-160 characters of a description before cutting it
// off mid-word, so trim to the last whole word inside that budget.
const DESCRIPTION_LIMIT = 155;

function metaDescription(value, limit = DESCRIPTION_LIMIT) {
  const text = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

// Related links are worth more to a reader and to a crawler when they share a
// subject, so rank by shared topics and fall back to how recent a story is.
function relatedPosts(posts, current, count = 3) {
  const topics = new Set((current.data && current.data.topics) || current.topics || []);
  const url = current.url || (current.page && current.page.url);
  return [...(posts || [])]
    .filter(post => post.url !== url)
    .map(post => {
      const shared = ((post.data && post.data.topics) || []).filter(slug => topics.has(slug)).length;
      return { post, shared, time: post.date ? new Date(post.date).getTime() : 0 };
    })
    .sort((a, b) => b.shared - a.shared || b.time - a.time)
    .slice(0, count)
    .map(entry => entry.post);
}

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif'
};

function imageMimeType(url) {
  const match = String(url || '').toLowerCase().match(/\.[a-z0-9]+$/);
  return (match && MIME_TYPES[match[0]]) || 'image/jpeg';
}

// Percent-encodes spaces and other unsafe characters while leaving the path
// separators alone, for image paths that reach XML and structured data.
function encodePath(url) {
  return encodeURI(String(url || ''));
}

function wordCount(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

module.exports = { metaDescription, relatedPosts, imageMimeType, encodePath, wordCount, DESCRIPTION_LIMIT };
