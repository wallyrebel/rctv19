export function validateCatalog(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['Catalog must be an object.'];
  if (data.version !== 1) errors.push('version must be 1.');
  if (!data.channel?.id || !data.channel?.name) errors.push('A channel id and name are required.');
  if (!Array.isArray(data.videos)) errors.push('videos must be an array.');
  const entries = [...(data.live ? [data.live] : []), ...(Array.isArray(data.videos) ? data.videos : [])];
  const ids = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') { errors.push('Each video must be an object.'); continue; }
    if (!entry.id || typeof entry.id !== 'string' || ids.has(entry.id)) errors.push('Every video needs a unique string id.');
    ids.add(entry.id);
    if (!entry.title || typeof entry.title !== 'string') errors.push(`${entry.id}: title is required.`);
    if (!['hls', 'mp4'].includes(entry.type)) errors.push(`${entry.id}: type must be hls or mp4.`);
    try {
      const url = new URL(entry.url);
      if (url.protocol !== 'https:') errors.push(`${entry.id}: media URL must use HTTPS.`);
      if (url.username || url.password) errors.push(`${entry.id}: credentials must not appear in a public media URL.`);
      if (/player\.frontlayer\.com|youtube\.com|youtu\.be/.test(url.hostname)) errors.push(`${entry.id}: provide direct licensed media, not a webpage or embedded player URL.`);
    } catch { errors.push(`${entry.id}: valid media URL is required.`); }
    if (entry !== data.live && (!Number.isFinite(entry.durationSeconds) || entry.durationSeconds <= 0)) errors.push(`${entry.id}: on-demand durationSeconds must be positive.`);
    for (const field of ['thumbnail', 'seriesThumbnail']) {
      if (entry[field] === undefined) continue;
      try { const url = new URL(entry[field]); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); }
      catch { errors.push(`${entry.id}: ${field} must be a public HTTPS image URL.`); }
    }
    for (const field of ['hdBifUrl','sdBifUrl']) {
      if (entry[field] === undefined) continue;
      try {
        const url = new URL(entry[field]);
        if (url.protocol !== 'https:' || url.username || url.password || !url.pathname.endsWith('.bif')) throw new Error();
      } catch { errors.push(`${entry.id}: ${field} must be a public HTTPS BIF URL.`); }
    }
  }
  if (data.live && data.live.type !== 'hls') errors.push('The live feed must use HLS.');
  return errors;
}

export function releaseBlockers(data) {
  const errors = validateCatalog(data);
  if (!data?.live) errors.push('A real, independent live feed has not been supplied.');
  if (!data?.videos?.length) errors.push('The on-demand library has not been supplied.');
  for (const item of data?.videos || []) {
    if (item.durationSeconds > 900 && (!item.hdBifUrl || !item.sdBifUrl)) errors.push(`${item.id}: long Roku replays require HD and SD trick-play previews.`);
  }
  return errors;
}
