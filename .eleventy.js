const pluginRss = require("@11ty/eleventy-plugin-rss");
const { optimizedImage } = require('./scripts/image-assets');
const { optimizeImages } = require('./scripts/optimize-images');
const { loadDimensions, imageSize, assetBytes } = require('./scripts/image-dimensions');
const { validateSite } = require('./scripts/validate-site');
const { TOPICS, MIN_POSTS_PER_TOPIC, topic } = require('./scripts/topics');
const { metaDescription, relatedPosts, imageMimeType, encodePath, wordCount } = require('./scripts/seo');

module.exports = function (eleventyConfig) {
  // Intrinsic image sizes are read up front so templates can reserve the right
  // space for each image without an async filter.
  eleventyConfig.on('eleventy.before', async () => { await loadDimensions(); });

  // Run for direct Eleventy builds too, including Cloudflare's existing command.
  eleventyConfig.on('eleventy.after', async ({ directories, outputMode }) => {
    if (outputMode !== 'fs') return;
    await optimizeImages(directories.output);
    validateSite(directories.output);
  });
  // Plugins
  eleventyConfig.addPlugin(pluginRss);

  // Passthrough copy
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "public/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  eleventyConfig.addFilter("jsonLd", value => JSON.stringify(value ?? "").replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("validPublisher", value => /^ca-pub-\d{16}$/.test(value || ""));
  eleventyConfig.addFilter("validSlot", value => /^\d+$/.test(value || ""));
  // Collections
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/blog/*.md").sort((a, b) => {
      return b.date - a.date; // Newest first
    });
  });

  eleventyConfig.addCollection("obituaries", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/obituaries/*.md").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("recentPosts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/blog/*.md")
      .sort((a, b) => b.date - a.date)
      .slice(0, 6);
  });

  // One entry per topic hub that has enough stories to be worth a page of its own.
  eleventyConfig.addCollection("topicPages", function (collectionApi) {
    const posts = collectionApi.getFilteredByGlob("src/blog/*.md").sort((a, b) => b.date - a.date);
    return TOPICS
      .map(definition => ({
        ...definition,
        url: `/topics/${definition.slug}/`,
        posts: posts.filter(post => (post.data.topics || []).includes(definition.slug))
      }))
      .filter(entry => entry.posts.length >= MIN_POSTS_PER_TOPIC);
  });

  // Filters
  eleventyConfig.addFilter("optimizedImage", optimizedImage);
  eleventyConfig.addFilter("imageSize", imageSize);
  eleventyConfig.addFilter("metaDescription", metaDescription);
  eleventyConfig.addFilter("imageMimeType", imageMimeType);
  eleventyConfig.addFilter("topicName", slug => (topic(slug) || {}).name || slug);
  eleventyConfig.addFilter("topicHeading", slug => (topic(slug) || {}).heading || slug);
  eleventyConfig.addFilter("relatedPosts", relatedPosts);
  eleventyConfig.addFilter("wordCount", wordCount);
  eleventyConfig.addFilter("encodePath", encodePath);
  eleventyConfig.addFilter("assetBytes", assetBytes);
  eleventyConfig.addFilter("articleBody", content => String(content || "")
    .replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "")
    .replace(/<(\/?)h1\b/gi, "<$1h2"));
  eleventyConfig.addFilter("dateDisplay", function (date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric", timeZone: "UTC"
    });
  });

  eleventyConfig.addFilter("dateISO", function (date) {
    if (!date) return "";
    return new Date(date).toISOString();
  });

  eleventyConfig.addFilter("excerpt", function (content) {
    if (!content) return "";
    // Strip HTML and limit to 150 chars
    const stripped = content.replace(/<[^>]*>/g, "");
    if (stripped.length <= 150) return stripped;
    return stripped.substring(0, 150).trim() + "...";
  });

  eleventyConfig.addFilter("limit", function (arr, limit) {
    return arr.slice(0, limit);
  });

  // Shortcodes
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Watch targets
  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
