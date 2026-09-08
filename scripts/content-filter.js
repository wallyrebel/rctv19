function plainText(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ')
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, dec) => String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10)))
    .replace(/&(?:apos|rsquo|lsquo);|[‘’]/gi, "'")
    .replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function unavailableContent(item) {
  const title = plainText(item.title);
  const body = plainText(item['content:encoded'] || item.content || item.description || '');
  const notice = /^(?:(?:sorry[,!]?)\s*)?(?:(?:this|the)\s+)?(?:content|post|page|video)\s+(?:(?:is|isn't|is not|is no longer|is currently|has been)\s+)?(?:unavailable|not available|available right now|removed|deleted|not found)\b/i;
  const failedGeneration = /\b(?:unable to (?:generate|create|write|produce|rewrite|summarize)\s+(?:(?:a|an|the|this)\s+)?(?:(?:comprehensive|news|professional)\s+)?(?:article|story|summary)|(?:cannot|can't|could not)\s+(?:generate|create|write|produce|rewrite|summarize)\s+(?:(?:a|an|the|this)\s+)?(?:article|story|summary)|insufficient (?:content|source material|data)|please provide (?:the )?(?:actual text|source material|article text))\b/i;
  return failedGeneration.test(title) || failedGeneration.test(body) || notice.test(title.replace(/^#+\s*/, '')) || notice.test(body.replace(/^#+\s*/, '')) ||
    /^(?:access denied|page not found|log in to (?:continue|facebook)|sign in to continue)\b/i.test(title) ||
    (!title && !body);
}

module.exports = { unavailableContent };

