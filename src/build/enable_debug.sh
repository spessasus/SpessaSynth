#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")" || exit
cd ../..
echo "🪲  Enabling debug mode, installing dependencies from the local machine"
npm uninstall spessasynth_lib spessasynth_core
npm install ../spessasynth_core
npm install ../spessasynth_lib

echo "✅  Installed dependencies! Building..."
npm run build:fast