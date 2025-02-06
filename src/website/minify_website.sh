#!/bin/bash
cd "$(dirname "$0")" || exit

cd ../spessasynth_lib/synthetizer/worklet_system || exit
chmod +x minify_processor.sh
./minify_processor.sh

cd ../../../website || exit

esbuild ./js/main/local_main.js --bundle --minify --format=esm --outfile=minified/local_main.min.js --platform=browser --external:./externals/libvorbis/encode_vorbis.js
esbuild ./js/main/demo_main.js --bundle --minify --format=esm --outfile=minified/demo_main.min.js --platform=browser --external:./externals/libvorbis/encode_vorbis.js
esbuild css/style.css --bundle --minify --format=esm --outfile=minified/style.min.css --platform=browser
echo "website minified succesfully"