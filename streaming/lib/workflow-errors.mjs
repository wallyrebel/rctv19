import path from 'node:path';

// Only classify known error patterns. Never copy tool stderr (which may contain
// credentials or signed requests) into the UI, saved job, or logs.
export function workflowFailureMessage(executable, args, stderr, code) {
  const tool = path.basename(args.find(value => /\.(mjs|js)$/.test(value)) || executable);
  const stage = ({
    'publish-vod.mjs': 'Video upload',
    'prepare-vod.mjs': 'Video preparation',
    'add-vod-to-catalog.mjs': 'Public video verification',
    'build-web.mjs': 'Website preparation',
    'wrangler.js': 'Website publishing',
  })[tool] || 'Video processing';
  let reason = '';
  if (/assert\.equal\(process\.env\.R2_BUCKET/.test(stderr)) reason = 'The replay upload settings conflict with inherited settings.';
  else if (/ReplayConfigurationError/.test(stderr)) reason = 'The private replay upload settings are missing or invalid. They need to be repaired before retrying.';
  else if (/AccessDenied|InvalidAccessKeyId|SignatureDoesNotMatch|InvalidToken|ExpiredToken/.test(stderr)) reason = 'Cloudflare rejected the replay upload credentials.';
  else if (/Authentication error|not logged in|login required|Failed to refresh|invalid_grant/i.test(stderr)) reason = 'Cloudflare sign-in needs to be renewed.';
  else if (/ENOENT/.test(stderr)) reason = 'A required local file could not be found.';
  else if (/EACCES|EPERM/.test(stderr)) reason = 'Windows denied access to a required file or process.';
  else if (/Remux requires H.264|Remux requires AAC/.test(stderr)) reason = 'This source needs the smaller-copy conversion option before it can be uploaded.';
  else if (/TimeoutError|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|NetworkingError/.test(stderr)) reason = 'The connection failed or timed out. Retry this saved show.';
  const knownType = stderr.match(/Replay publishing stopped \(([A-Za-z0-9_]+)\)/)?.[1]
    || stderr.match(/\b(?:Error|AssertionError|TypeError) \[([A-Z0-9_]+)\]/)?.[1];
  return `${stage} stopped (code ${code}${knownType ? `, ${knownType}` : ''}). ${reason || 'Retry this saved show; its original and completed preparation are kept.'}`;
}
