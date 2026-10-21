#!/bin/sh
# Local-only helper for this repository checkout. It copies the framework into
# node_modules without npm or Node, so the example can run with Fairyfly alone.
set -e

root=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)
target="node_modules/vellum-docs"

mkdir -p node_modules
rm -rf "$target"
mkdir -p "$target"
cp -R "$root/src" "$root/bin" "$root/package.json" "$target/"

echo "✓ copied vellum-docs into $target"
echo "  next: ff start"
