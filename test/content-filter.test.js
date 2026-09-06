const { test } = require('node:test');
const assert = require('node:assert/strict');
const { unavailableContent } = require('../scripts/content-filter');

test('blocks unavailable-content notices before rewriting', () => {
  for (const title of ["This content isn't available right now", 'This content isn’t available right now',
    'This content isn&#39;t available right now', 'Content Unavailable: Understanding Why Posts Disappear',
    'This post has been deleted', 'Page not found', 'Log in to Facebook']) {
    assert.equal(unavailableContent({ title }), true, title);
  }
  assert.equal(unavailableContent({ title: 'Ripley Main Street', content: '<p>This content is not available right now</p>' }), true);
  assert.equal(unavailableContent({}), true);
});

test('preserves real news mentioning availability or social media', () => {
  for (const title of ['Tickets unavailable for sold-out Ripley concert', 'Ripley announces Christmas parade',
    'School explains social media privacy changes', 'Williams Baptist beats Blue Mountain']) {
    assert.equal(unavailableContent({ title, content: 'A community update with reported facts.' }), false, title);
  }
});
