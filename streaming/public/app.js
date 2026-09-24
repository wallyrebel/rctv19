const $ = id => document.getElementById(id);
const video = $('video');
let catalog, selected, hls, category = 'All';
const embedded = location.pathname.startsWith('/embed/');
if (embedded) document.body.classList.add('embed');
const parameters = new URLSearchParams(location.search);
const autoplay = parameters.get('autoplay') === '1';
video.muted = parameters.get('muted') === '1' || autoplay;
const text = (id, value) => { $(id).textContent = value; };
const safeImage = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };

function fail(message) { text('error-text', message); $('playback-error').hidden = false; }
function resetPlayer() {
  video.pause();
  video.hidden = true;
  if (hls) { hls.destroy(); hls = undefined; }
  video.removeAttribute('src'); video.load();
}
function select(item) {
  resetPlayer(); selected = item; $('playback-error').hidden = true; $('cover').hidden = false;
  text('selected-title', item.title); text('selected-description', item.description || '');
  text('cover-title', item.title); text('cover-description', item.description || '');
  text('live-status', item === catalog.live ? 'LIVE CHANNEL' : 'ON DEMAND');
  text('status', item === catalog.live ? 'Select Watch live to join the broadcast.' : 'Select Play replay to watch from the beginning.');
  $('play').textContent = item === catalog.live ? '▶  Watch live' : '▶  Play replay';
  $('play').disabled = false;
  $('play').hidden = false;
  $('return-live').hidden = !catalog.live || item === catalog.live;
  if (safeImage(item.thumbnail)) video.poster = item.thumbnail; else video.removeAttribute('poster');
}
async function start() {
  if (!selected) return;
  const item = selected;
  resetPlayer(); $('playback-error').hidden = true; $('cover').hidden = true; video.hidden = false;
  const play = () => video.play().catch(() => { $('cover').hidden = false; text('status', 'Select play to start the video.'); });
  if (item.type === 'hls' && window.Hls?.isSupported()) {
    const currentHls = new window.Hls({ enableWorker: true, maxBufferLength: 30 }); hls = currentHls;
    currentHls.on(window.Hls.Events.MANIFEST_PARSED, () => { if (hls === currentHls) play(); });
    currentHls.on(window.Hls.Events.ERROR, (_, data) => { if (data.fatal && hls === currentHls) { currentHls.destroy(); hls = undefined; fail(item === catalog.live ? 'The live feed is currently unavailable. Please try again shortly.' : 'This replay could not be loaded. Please try again.'); } });
    currentHls.loadSource(item.url); currentHls.attachMedia(video);
  } else if (item.type === 'mp4' || video.canPlayType('application/vnd.apple.mpegurl')) { video.src = item.url; await play(); }
  else fail('This browser cannot play this stream. Please try a current browser.');
}
video.addEventListener('error', () => { if (selected && video.getAttribute('src')) fail('The video could not be played. Please try again shortly.'); });
$('play').addEventListener('click', start);
$('retry').addEventListener('click', start);
$('close-error').addEventListener('click', () => { if (selected) select(selected); });
$('return-live').addEventListener('click', () => select(catalog.live));

function renderLibrary() {
  const query = $('search').value.trim().toLowerCase();
  const entries = catalog.videos.filter(v => (category === 'All' || (v.category || 'Shows') === category) && `${v.title} ${v.description || ''}`.toLowerCase().includes(query));
  $('videos').replaceChildren();
  $('empty').hidden = entries.length > 0;
  text('empty', catalog.videos.length ? 'No shows match your search.' : 'Replays and shows will appear here when they’re available.');
  for (const item of entries) {
    const card = document.createElement('button'); card.className = 'video-card'; card.setAttribute('aria-label', `Play ${item.title}`);
    const thumb = document.createElement('div'); thumb.className = 'thumbnail'; thumb.textContent = '▶';
    const imageUrl = safeImage(item.thumbnail);
    if (imageUrl) { const img = document.createElement('img'); img.src = imageUrl; img.alt = ''; img.loading = 'lazy'; thumb.append(img); }
    const duration = document.createElement('span'); duration.className = 'duration'; duration.textContent = `${Math.floor(item.durationSeconds / 60)}:${String(Math.floor(item.durationSeconds % 60)).padStart(2, '0')}`; thumb.append(duration);
    const copy = document.createElement('div'); copy.className = 'card-copy';
    for (const [tag, value] of [['small', item.category || 'Shows'], ['h3', item.title], ['p', item.description || '']]) { const el = document.createElement(tag); el.textContent = value; copy.append(el); }
    card.append(thumb, copy); card.addEventListener('click', () => { select(item); start(); video.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); $('videos').append(card);
  }
}
function renderCategories() {
  const categories = ['All', ...new Set(catalog.videos.map(v => v.category || 'Shows'))];
  for (const value of categories) {
    const b = document.createElement('button'); b.textContent = value; b.setAttribute('aria-pressed', value === category);
    b.addEventListener('click', () => { category = value; for (const button of $('categories').children) button.setAttribute('aria-pressed', button === b); renderLibrary(); }); $('categories').append(b);
  }
}
$('search').addEventListener('input', () => { if (catalog) renderLibrary(); });
$('embed-code').value = `<iframe src="${location.origin}/embed/rctv19" title="RCTV 19 live player" style="width:100%;aspect-ratio:16/9;border:0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
$('copy-embed').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('embed-code').value); text('copy-status', 'Embed code copied.'); }
  catch { $('embed-code').select(); text('copy-status', 'Select and copy the code above.'); }
});
try {
  const response = await fetch('/api/catalog.json', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Catalog unavailable');
  catalog = await response.json();
  const requested = [catalog.live, ...catalog.videos].filter(Boolean).find(v => v.id === parameters.get('video'));
  if (requested || catalog.live) select(requested || catalog.live);
  else { text('status', 'The next broadcast will appear here when it’s available.'); text('live-status', 'BETWEEN BROADCASTS'); $('play').hidden = true; }
  renderCategories(); renderLibrary();
  if (autoplay && selected) start();
} catch { text('status', 'Programming could not be loaded. Refresh the page to try again.'); text('live-status', 'TEMPORARILY UNAVAILABLE'); }
