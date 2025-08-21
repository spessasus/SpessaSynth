# Sl-web-ogg
Original library Copyright © 2024 Erik Hermansen.

I've made a few fixes to work with the latest emscripten and compiled it.
Changes:
- fixed wasm not initialized errors
- Uint8Array[] instead of blob
- allow memory growth
- more initial memory
- O3 optimization