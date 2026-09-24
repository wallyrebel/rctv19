import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

export function validateLiveConfig(values) {
  if (values.R2_BUCKET !== 'rctv19-live'
    || !/^[a-f0-9]{32}$/.test(values.R2_ACCOUNT_ID || '')
    || !values.R2_ACCESS_KEY_ID?.trim() || !values.R2_SECRET_ACCESS_KEY?.trim()) {
    const error = new Error('The private RCTV 19 live upload settings are missing or invalid.');
    error.name = 'LiveConfigurationError';
    throw error;
  }
  return Object.fromEntries(['R2_BUCKET', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].map(key => [key, values[key]]));
}

export async function readLiveConfig(file) {
  try { return validateLiveConfig(parseEnv(await readFile(file, 'utf8'))); }
  catch { return validateLiveConfig({}); }
}
