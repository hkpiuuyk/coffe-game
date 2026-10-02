# C + React café game

`cafe.c` calculates brewing progress, success ranges and quality, customer patience,
and discounted ingredient costs. The compiled `src/native/cafe.wasm` runs in the
browser through WebAssembly. React handles the UI, orders and accounts.

- `npm run dev`: build the C engine if the compiler is available, then start Vite.
- `npm run build`: build the C engine and production website.
- `npm test`: run tests against the actual compiled C engine.
- `npm run native:build`: force recompilation after editing C.

Compiler setup: `python -m pip install --target .tools ziglang==0.14.1`.
The Windows compiler defaults to `.tools/ziglang/zig.exe`; set `CAFE_ZIG`
to an alternate Zig executable. The generated wasm is kept with the project,
so running an existing build does not require installing a compiler.
Changing C source requires recompiling and refreshing the browser.
