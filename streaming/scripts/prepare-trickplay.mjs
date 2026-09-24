import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { prepareTrickplay } from '../lib/prepare-trickplay.mjs';
const [input, directory] = process.argv.slice(2);
assert.ok(input && directory, 'Usage: prepare-trickplay.mjs INPUT PREPARED_DIRECTORY');
const metadata = JSON.parse(await readFile(path.join(directory,'metadata.json'),'utf8'));
await prepareTrickplay(input, directory, metadata.durationSeconds);
