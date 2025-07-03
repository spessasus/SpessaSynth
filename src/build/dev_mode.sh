#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")" || exit

cd ../..

echo "‍🖥️  Dev mode enabled! Building..."

npm run build

echo "🖥️ Starting server...",
node ./server/server.js