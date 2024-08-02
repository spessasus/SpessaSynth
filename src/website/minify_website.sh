#!/bin/bash
cd "$(dirname "$0")"

cd ../spessasynth_lib/synthetizer/worklet_system
chmod +x minify_processor.sh
./minify_processor.sh

cd ../../../website

ls

esbuild ./local_main.js --bundle --minify --format=esm --outfile=minified/local_main.min.js --platform=browser
esbuild ./demo_main.js --bundle --minify --format=esm --outfile=minified/demo_main.min.js --platform=browser
esbuild css/style.css --bundle --minify --format=esm --outfile=minified/style.min.css --platform=browser
echo "website minified succesfully"