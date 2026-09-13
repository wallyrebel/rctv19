const { topicsFor } = require('../../scripts/topics');

module.exports = {
  eleventyComputed: {
    // Topics drive the hub pages, the related-story links and articleSection in
    // the article schema. A post may set `topics` in its front matter to override.
    topics: data => data.topics || topicsFor({ title: data.title, excerpt: data.excerpt })
  }
};
