#!/bin/bash
cd "$(dirname "$0")" || exit
cd ../..

echo "Attempting to build spessasynth_lib"

node_modules/spessasynth_lib/build_scripts/build.sh || echo "lib is in release mode"

echo "Copying worklet_processor"
cp node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js src/website/minified/worklet_processor.min.js
cp node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js.map src/website/minified/worklet_processor.min.js.map || echo "No processor map for debugging"

cd "$(dirname "$0")" || exit
cd ../..

cd src/website

echo "Building the website"
esbuild ./js/main/demo_main.js --bundle --tree-shaking=true --minify --sourcemap=linked --format=esm --outfile=minified/demo_main.min.js --platform=browser --external:./externals/libvorbis/encode_vorbis.js
esbuild css/style.css --bundle --minify --tree-shaking=true --sourcemap=linked --format=esm --outfile=minified/style.min.css --platform=browser

esbuild ./js/main/local_main.js --bundle --tree-shaking=true --minify --sourcemap=linked --format=esm --outfile=minified/local_main.min.js --platform=browser --external:./externals/libvorbis/encode_vorbis.js
echo "website minified succesfully"