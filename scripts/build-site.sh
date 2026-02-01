#!/usr/bin/env bash
set -euo pipefail

DIST_DIR="dist/site"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Landing page → root
cp -r apps/web/dist/* "$DIST_DIR/"

# Documentation → /docs/
mkdir -p "$DIST_DIR/docs"
cp -r apps/docs/dist/* "$DIST_DIR/docs/"

# Playground → /playground/
mkdir -p "$DIST_DIR/playground"
cp -r apps/playground/dist/* "$DIST_DIR/playground/"

# Cloudflare Pages headers
cp _headers "$DIST_DIR/"

echo "✅ Site merged into $DIST_DIR"
