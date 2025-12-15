#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")" || exit
cd ../..
echo "🪲  Enabling debug mode, building both libraries"
echo "This expects spessasynth_core, spessasynth_lib and SpessaSynth to be in the same directory."

echo "Building core..."

cd ../spessasynth_core
npm run build


echo "Building lib..."

cd ../spessasynth_lib
npm run debug

echo "Web App"

cd ../SpessaSynth
npm run debug
npm run build:fast

