import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'src/native/cafe.wasm');
const compiler = process.env.CAFE_ZIG || path.join(root, '.tools/ziglang/zig.exe');
if (!existsSync(compiler)) {
  if (existsSync(output) && !process.argv.includes('--force')) {
    console.log('Using precompiled C engine: src/native/cafe.wasm');
    process.exit(0);
  }
  throw new Error('Install compiler: python -m pip install --target .tools ziglang==0.14.1 (or set CAFE_ZIG).');
}
mkdirSync(path.dirname(output), { recursive: true });
const exports = ['brew_step', 'brew_min', 'brew_max', 'brew_quality', 'patience_step', 'ingredient_cost'];
const result = spawnSync(compiler, ['cc', '--target=wasm32-freestanding', '-O2', '-nostdlib', '-Wl,--no-entry', ...exports.map(name => `-Wl,--export=${name}`), 'native/cafe.c', '-o', output], {
  cwd: root, stdio: 'inherit', env: { ...process.env, ZIG_GLOBAL_CACHE_DIR: path.join(root, '.tools/zig-cache') },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log('C engine compiled to WebAssembly.');
