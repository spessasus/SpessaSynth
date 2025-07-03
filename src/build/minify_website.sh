#!/usr/bin/bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")"/../.. && pwd)"
cd "$REPO_ROOT"

BUILD_SCRIPT="node $REPO_ROOT/node_modules/spessasynth_lib/build_scripts/build.js"
LIB_WORKLET="$REPO_ROOT/node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js"
WEBSITE_DIR="$REPO_ROOT/src/website"
SOUNDFONT="GeneralUserGS.sf3"

DEMO_DIR_SRC="$REPO_ROOT/dist/minified"
DEMO_DIR="$REPO_ROOT/dist"
LOCAL_DIR="$REPO_ROOT/local-dev"

ZIP_NAME="SpessaSynth-LocalEdition.zip"
ZIP_FOLDER="local-edition-build"



echo
echo "⚙️  0) Build spessasynth_lib"
if out=$($BUILD_SCRIPT 2>&1); then
  echo "$out"
else
  echo "⚠️  spessasynth_lib was not locally installed; using npm‑published version"
fi

echo
echo "⚙️  1) Clean dist directories"
rm -rf "$DEMO_DIR"
rm -rf "$LOCAL_DIR"
rm -rf "$ZIP_FOLDER"

mkdir -p "$DEMO_DIR_SRC"
mkdir -p "$LOCAL_DIR"

echo
echo "📋  2) Copy files (+ map if any)"
# worklet
cp "$LIB_WORKLET" \
   "$DEMO_DIR_SRC"
cp "$LIB_WORKLET" \
    "$LOCAL_DIR"

# worklet map
cp "$LIB_WORKLET.map" \
   "$LOCAL_DIR" 2>/dev/null && \
   echo "• Map copied (debug enabled)" || \
   echo "• No map found (npm‑published)"

# html
cp "$WEBSITE_DIR/demo_index.html" "$DEMO_DIR/index.html"
cp "$WEBSITE_DIR/local_edition_index.html" "$LOCAL_DIR"

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

# dist (pages)
# no sourcemap for dist
esbuild "$WEBSITE_DIR/js/main/demo_main.js" \
--bundle \
--tree-shaking=true \
--minify \
--splitting \
--format=esm \
--outdir="$DEMO_DIR_SRC" \
--platform=browser
esbuild "$WEBSITE_DIR/css/style.css" \
--bundle  \
--minify \
--tree-shaking=true \
--format=esm \
--outfile="$DEMO_DIR_SRC/style.min.css" \
--platform=browser

# local (local edition)
esbuild "$WEBSITE_DIR/js/main/local_main.js" \
--bundle \
--tree-shaking=true \
--minify \
--sourcemap=linked \
--format=esm \
--outdir="$LOCAL_DIR" \
--splitting \
--platform=browser
esbuild "$WEBSITE_DIR/css/style.css" \
--bundle  \
--minify \
--tree-shaking=true \
--sourcemap=linked \
--format=esm \
--outfile="$LOCAL_DIR/style.min.css" \
--platform=browser

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
