import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

export async function readReplayConfig(file) {
  try {
    // A live broadcast can set R2_* in its parent process. Replay uploads must
    // always use the replay key and bucket from this private file instead.
    const values = parseEnv(await readFile(file, 'utf8'));
    if (values.R2_BUCKET !== 'rctv19-vod'
      || !/^[a-f0-9]{32}$/.test(values.R2_ACCOUNT_ID || '')
      || !values.R2_ACCESS_KEY_ID?.trim() || !values.R2_SECRET_ACCESS_KEY?.trim()) throw new Error();
    return {
      bucket: values.R2_BUCKET,
      endpoint: `https://${values.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: values.R2_ACCESS_KEY_ID, secretAccessKey: values.R2_SECRET_ACCESS_KEY },
    };
  } catch {
    const error = new Error('The private replay upload settings are missing or invalid.');
    error.name = 'ReplayConfigurationError';
    throw error;
  }
}
