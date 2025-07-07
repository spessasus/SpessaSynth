#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")" || exit

cd ../..

echo "‍🖥️  Dev mode enabled!"

if [  ! -f "./server/server.js" ]; then
echo "Server doesn't exist. Rebuilding..."
npm run build
fi

echo "🖥️ Starting server..."
node ./server/server.js