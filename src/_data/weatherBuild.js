// Cloudflare supplies the precise Git commit used for this build.
module.exports = () => ({commit: process.env.CF_PAGES_COMMIT_SHA || null});
