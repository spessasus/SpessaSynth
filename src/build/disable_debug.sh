#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")" || exit

cd ../..

echo "⚠️  Disabling debug mode, installing dependencies from the npm registry"
npm uninstall spessasynth_lib spessasynth_core
npm install spessasynth_lib
npm install spessasynth_core
npm pkg set dependencies.spessasynth_core=latest
npm pkg set dependencies.spessasynth_lib=latest
npm i
echo "✅  Success! Building..."
npm run build