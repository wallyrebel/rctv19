// Website-only integration; native apps and embedded players stay unchanged.
export const publisherId = 'ca-pub-3245500092050206';
export const watchPaths = ['/', '/index.html', '/watch/rctv19', '/watch/rctv19/', '/watch/rctv19/index.html'];
export function createNonce() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
}
export function adPolicy(nonce) {
  // Authorize only nonced scripts and their trusted descendants. No arbitrary
  // inline scripts, eval, or HTTP/HTTPS script-origin wildcards are permitted.
  return "default-src 'self'; script-src 'nonce-" + nonce + "' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' https: blob:; connect-src 'self' https:; worker-src 'self' blob:; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; frame-ancestors 'self'; object-src 'none'; base-uri 'none'";
}
export function adMarkup(nonce) {
  return '<meta name="google-adsense-account" content="' + publisherId + '"><script nonce="' + nonce + '" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + publisherId + '" crossorigin="anonymous"></script>';
}
