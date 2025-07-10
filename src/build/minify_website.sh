#!/usr/bin/bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")"/../.. && pwd)"
cd "$REPO_ROOT"

WEBSITE_DIR="$REPO_ROOT/src/website"
SOUNDFONT="GeneralUserGS.sf3"

DEMO_DIR_SRC="$REPO_ROOT/dist/minified"
DEMO_DIR="$REPO_ROOT/dist"
LOCAL_DIR="$REPO_ROOT/local-dev"

ZIP_NAME="SpessaSynth-LocalEdition.zip"
ZIP_FOLDER="local-edition-compiled-$(date +%Y-%m-%d)"

echo
echo "⚙️  1) Clean dist directories"
rm -rf "$DEMO_DIR"
rm -rf "$LOCAL_DIR"
rm -rf "$ZIP_FOLDER"

echo
echo "⚙️  2) Create directories and copy files"

mkdir -p "$DEMO_DIR_SRC"
mkdir -p "$LOCAL_DIR"

# html
cp "$WEBSITE_DIR/html/demo_index.html" "$DEMO_DIR/index.html"
cp "$WEBSITE_DIR/html/local_edition_index.html" "$LOCAL_DIR"

# favicon
cp "$WEBSITE_DIR/favicon.ico" "$DEMO_DIR"

# server
cp -r "$WEBSITE_DIR/server" "$REPO_ROOT"

# package and soundfont
cp package.json "$DEMO_DIR"
mkdir -p "$DEMO_DIR/soundfonts"
cp -p "$REPO_ROOT/soundfonts/$SOUNDFONT" "$DEMO_DIR/soundfonts/"

echo
echo "🏗️  3) Build"

node "$REPO_ROOT/src/build/build.js"

echo
echo "🗂️  4) Prepare Local‑Edition ZIP"
cd "$REPO_ROOT"

rm -rf "$ZIP_FOLDER"

mkdir -p "$ZIP_FOLDER/local-dev"
rsync -av \
  --include='*/' \
  --include='*.js' \
  --exclude='*.js.map' \
  --exclude='*' \
  "$LOCAL_DIR" "$ZIP_FOLDER"

cp "$LOCAL_DIR/style.min.css" "$ZIP_FOLDER/local-dev"
cp "$LOCAL_DIR/local_edition_index.html" "$ZIP_FOLDER/local-dev"

cp -r "$WEBSITE_DIR/server" "$ZIP_FOLDER"
cp "$REPO_ROOT/Open SpessaSynth.bat" "$ZIP_FOLDER"
cp "$REPO_ROOT/package.json" "$ZIP_FOLDER"
cp "$REPO_ROOT/LICENSE" "$ZIP_FOLDER"
cp "$REPO_ROOT/README.md" "$ZIP_FOLDER"

mkdir -p "$ZIP_FOLDER/soundfonts"
cp "$REPO_ROOT/soundfonts/$SOUNDFONT" "$ZIP_FOLDER/soundfonts/$SOUNDFONT"


zip -r "$DEMO_DIR/$ZIP_NAME" "$ZIP_FOLDER"

rm -rf "$ZIP_FOLDER"

echo
echo "✅ Build complete!"
# tab so local is aligned
echo " • dist/                                ← Github Pages"
echo " • local/                               ← Local Edition ready for debugging"
echo " • dist/$ZIP_NAME    ← Local‑Edition zip"
