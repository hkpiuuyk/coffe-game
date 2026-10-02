import { readFile } from 'node:fs/promises';
import { initializeEngine } from '../src/c-engine.js';
await initializeEngine(await readFile(new URL('../src/native/cafe.wasm', import.meta.url)));
