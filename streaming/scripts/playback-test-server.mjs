import { createServer } from '../server.mjs';
import { fileURLToPath } from 'node:url';
createServer({catalogPath:fileURLToPath(new URL('../tests/fixtures/playback.json',import.meta.url))}).listen(4174,'127.0.0.1',()=>console.log('Isolated playback test: http://127.0.0.1:4174/embed/rctv19?video=playback-test&muted=1'));
