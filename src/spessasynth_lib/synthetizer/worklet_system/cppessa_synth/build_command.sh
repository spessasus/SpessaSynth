em++ main.cpp -o ../cpessasynth.js \
-s EXPORTED_FUNCTIONS="['_malloc', '_free']" \
-s SINGLE_FILE=1 \
-s WASM=1 \
-s WASM_ASYNC_COMPILATION=0 \
-s MODULARIZE=1 \
-s EXPORT_ES6=1 \
-s ENVIRONMENT="shell"