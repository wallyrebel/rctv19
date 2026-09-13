// Exposes the topic hub definitions to templates. The matching rules live in
// scripts/topics.js so the build and the tests share one source.
const { TOPICS } = require('../../scripts/topics');

module.exports = TOPICS.map(({ slug, name, heading, title, description, intro }) => ({
  slug,
  name,
  heading,
  title,
  description,
  intro,
  url: `/topics/${slug}/`
}));
