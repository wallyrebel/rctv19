const { bodyWordCount } = require('../../scripts/word-count');

// Google's Publisher Policies expect ad-supported pages to carry substantive
// content of their own. Short aggregated briefs stay on the site for readers,
// but they do not get ad slots.
const MIN_AD_WORDS = 250;

// Utility and policy pages are intentionally ad-free.
const AD_FREE_PATHS = new Set([
  '/privacy/',
  '/editorial/',
  '/terms/',
  '/contact/',
  '/404.html'
]);

module.exports = {
  wordCount: data => bodyWordCount(data.page && data.page.rawInput),

  adsEligible: data => {
    if (data.noAds || data.noindex) return false;
    if (AD_FREE_PATHS.has(data.page && data.page.url)) return false;
    if (!data.isArticle) return true;
    return data.wordCount >= MIN_AD_WORDS;
  }
};
