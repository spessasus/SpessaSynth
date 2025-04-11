#!/bin/bash
cd "$(dirname "$0")" || exit
esbuild ../spessasynth_lib/synthetizer/worklet_system/worklet_processor.js --bundle --minify --format=esm --outfile=../spessasynth_lib/synthetizer/worklet_processor.min.js --platform=browser
echo "Processor minifed succesfully"