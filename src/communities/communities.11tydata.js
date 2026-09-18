// Every community profile is a page under /communities/<slug>/, so the layout and
// URL are set once here rather than repeated in the front matter of each file.
module.exports = {
  layout: 'layouts/page.njk',
  permalink: data => `/communities/${data.page.fileSlug}/index.html`
};
