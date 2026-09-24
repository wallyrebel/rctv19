import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, releaseBlockers } from '../lib/catalog.mjs';
const base = () => ({ version: 1, channel: { id: 'sports', name: 'Sports' }, live: null, videos: [] });
const media = () => ({ id: 'game-1', title: 'Game', url: 'https://media.example.org/game.m3u8', type: 'hls', durationSeconds: 600 });
test('empty development catalog is valid but cannot pass a release check', () => { assert.deepEqual(validateCatalog(base()), []); assert.equal(releaseBlockers(base()).length, 2); });
test('real live and VOD records pass the media gate', () => { const c = base(); c.live = { ...media(), id: 'live' }; c.videos = [media()]; assert.deepEqual(releaseBlockers(c), []); });
test('rejects duplicate IDs, insecure URLs, credentials and web player pages', () => {
  for (const url of ['http://media.example.org/a.m3u8', 'https://user:secret@media.example.org/a.m3u8', 'https://player.frontlayer.com/live/fl238965', 'https://www.youtube.com/watch?v=1']) { const c = base(); c.videos = [{ ...media(), url }]; assert.ok(validateCatalog(c).length > 0, url); }
  const c = base(); c.live = media(); c.videos = [media()]; assert.ok(validateCatalog(c).some(e => e.includes('unique')));
});
