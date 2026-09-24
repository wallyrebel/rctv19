import { readFile } from 'node:fs/promises';
import { validateCatalog, releaseBlockers } from '../lib/catalog.mjs';
const data = JSON.parse(await readFile(new URL('../catalog/rctv19.json', import.meta.url), 'utf8'));
const errors = process.argv.includes('--release') ? releaseBlockers(data) : validateCatalog(data);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(process.argv.includes('--release') ? 'Media fields complete; device and store review still required.' : 'Catalog valid. No media has been invented or imported.');
