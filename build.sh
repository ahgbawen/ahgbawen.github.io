#!/bin/bash
# Bangun index.html dari index.src.html dengan nomor build (cache-busting), cek sintaks JS.
set -e
cd "$(dirname "$0")"
B=$(date +%Y%m%d-%H%M%S)
for f in js/*.js; do node -e "new Function(require('fs').readFileSync('$f','utf8'))" || { echo "Sintaks error: $f"; exit 1; }; done
sed "s/__BUILD__/$B/g" index.src.html > index.html
echo "BUILD $B"
