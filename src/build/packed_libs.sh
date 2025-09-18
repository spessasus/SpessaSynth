#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")" || exit
cd ../..
echo "🪲  Enabling debug mode, packing and installing dependencies"
echo "This expects spessasynth_core, spessasynth_lib and SpessaSynth to be in the same directory."

echo "core"

cd ../spessasynth_core
rm -f *.tgz
npm pack
tgz_core=$(find . -maxdepth 1 -name "*.tgz" -print -quit)
tgz_core_path=$(realpath "$tgz_core" 2>/dev/null)


echo "lib"

cd ../spessasynth_lib
rm -f *.tgz
npm uninstall spessasynth_core
npm install "$tgz_core_path"
npm pack

tgz_lib=$(find . -maxdepth 1 -name "*.tgz" -print -quit)
tgz_lib_path=$(realpath "$tgz_lib" 2>/dev/null)

echo "Web App"

cd ../SpessaSynth
npm uninstall spessasynth_core spessasynth_lib
npm install "$tgz_core_path" "$tgz_lib_path"
npm run build:fast

