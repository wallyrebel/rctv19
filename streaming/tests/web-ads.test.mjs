import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';

test('watch pages load one AdSense script with fresh matching CSP nonces; embeds remain ad-free', async () => {
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    const nonces=new Set();
    for(const route of ['/', '/', '/watch/rctv19/', '/watch/rctv19?video=episode']) {
      const response=await fetch(base+route);
      const html=await response.text();
      assert.equal(response.status,200);
      const policy=response.headers.get('content-security-policy');
      const nonce=policy.match(/'nonce-([^']+)'/)[1];
      assert.ok(!nonces.has(nonce)); nonces.add(nonce);
      assert.match(response.headers.get('cache-control'),/no-store/);
      const scripts=[...html.matchAll(/<script\b[^>]*>/g)].map(m=>m[0]);
      assert.equal(scripts.length,3);
      for(const script of scripts) assert.ok(script.includes(`nonce="${nonce}"`));
      assert.equal(scripts.filter(s=>s.includes('adsbygoogle.js?client=ca-pub-3245500092050206')).length,1);
      const scriptPolicy=policy.match(/script-src ([^;]+)/)[1];
      assert.match(scriptPolicy,/'strict-dynamic'/);
      assert.doesNotMatch(scriptPolicy,/unsafe|https?:/);
      assert.match(policy,/frame-ancestors 'self'/);
      assert.match(html,/id="video"/);
    }
    for(const route of ['/embed/rctv19','/privacy/','/missing']) {
      const response=await fetch(base+route);
      assert.doesNotMatch(await response.text(),/adsbygoogle\.js/);
    }
    const ads=await fetch(base+'/ads.txt');
    assert.match(ads.headers.get('content-type'),/text\/plain/);
    assert.equal((await ads.text()).trim(),'google.com, pub-3245500092050206, DIRECT, f08c47fec0942fa0');
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
