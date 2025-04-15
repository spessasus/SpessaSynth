#!/bin/bash
cd "$(dirname "$0")" || exit


cp ../../node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js ../website/minified/worklet_processor.min.js
cp ../../node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js.map ../website/minified/worklet_processor.min.js.map || echo "no proc!"

cd ../website

esbuild ./js/main/demo_main.js --bundle --tree-shaking=true --minify --sourcemap=linked --format=esm --outfile=minified/demo_main.min.js --platform=browser --external:./externals/libvorbis/encode_vorbis.js
esbuild css/style.css --bundle --minify --tree-shaking=true --sourcemap=linked --format=esm --outfile=minified/style.min.css --platform=browser

esbuild ./js/main/local_main.js --bundle --tree-shaking=true --minify --sourcemap=linked --format=esm --outfile=minified/local_main.min.js --platform=browser --external:./externals/libvorbis/encode_vorbis.js
echo "website minified succesfully"