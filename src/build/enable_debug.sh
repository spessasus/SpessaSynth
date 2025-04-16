#!/bin/bash
cd "$(dirname "$0")" || exit

cd ../..
npm uninstall spessasynth_lib spessasynth_core
npm install ../spessasynth_lib
npm install ../spessasynth_core
echo "Installed dependencies! Starting build"
npm run build