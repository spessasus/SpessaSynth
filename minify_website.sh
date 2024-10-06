#!/bin/bash
cd "$(dirname "$0")" || exit

npm i
npm run build
echo "website minified succesfully"
