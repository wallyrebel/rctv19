import { createNonce, adPolicy, adMarkup, watchPaths } from './lib/web-ads.mjs';

export default {
  async fetch(request, env) {
    const asset = await env.ASSETS.fetch(request);
    if (!watchPaths.includes(new URL(request.url).pathname) || asset.status !== 200 || !asset.headers.get('Content-Type')?.includes('text/html')) return asset;
    const nonce = createNonce();
    const response = new Response(asset.body, asset);
    response.headers.set('Content-Security-Policy', adPolicy(nonce));
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.delete('ETag');
    response.headers.delete('Last-Modified');
    response.headers.delete('Content-Length');
    return new HTMLRewriter()
      .on('script', { element(element) { element.setAttribute('nonce', nonce); } })
      .on('head', { element(element) { element.append(adMarkup(nonce), { html: true }); } })
      .transform(response);
  }
};
