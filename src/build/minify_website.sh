#!/bin/bash
cd "$(dirname "$0")" || exit
cd ../..

echo "Attempting to build spessasynth_lib"

node node_modules/spessasynth_lib/build_scripts/build.js > /dev/null 2>&1 \
  && echo "Spessasynth_lib build succeeded: debugging for spessasynth_lib enabled!" \
  || echo "Unable to build spessasynth_lib: installed from npm registry"


echo "Copying worklet_processor from spessasynth_lib"
cp node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js \
 src/website/minified/worklet_processor.min.js
cp node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js.map src/website/minified/worklet_processor.min.js.map > /dev/null 2>&1 \
 && echo "Processor map copied: debugging for spessasynth_lib enabled!" \
 || echo "No processor map for debugging: installed from npm registry"

cd src/website

echo "Building the website"
esbuild ./js/main/demo_main.js --bundle --tree-shaking=true --minify --sourcemap=linked --format=esm --outfile=minified/demo_main.min.js --platform=browser --external:./externals/libvorbis/encode_vorbis.js
esbuild css/style.css --bundle --minify --tree-shaking=true --sourcemap=linked --format=esm --outfile=minified/style.min.css --platform=browser

esbuild ./js/main/local_main.js --bundle --tree-shaking=true --minify --sourcemap=linked --format=esm --outfile=minified/local_main.min.js --platform=browser --external:./externals/libvorbis/encode_vorbis.js
echo "SpessaSynth built successfully!"