em++ main.cpp -o cpessasynth.js \
-s EXPORTED_FUNCTIONS="['_malloc', '_free']" \
-s MODULARIZE=1 \
-s EXPORT_ES6=1 \
-s ENVIRONMENT="shell"