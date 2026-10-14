#!/usr/bin/env bash
# Copy the allowlist into public/ for the static publish directory.
# Dotfiles, README, render.yaml, the Worker, and tests are never copied.
set -eu
root="$(cd "$(dirname "$0")/.." && pwd)"
list="$root/scripts/published-files.txt"
dest_root="$root/public"

node "$root/scripts/write-og-image.js"
if [ ! -f "$root/og-image.png" ]; then
  echo "og-image.png was not written" >&2
  exit 1
fi

rm -rf "$dest_root"
mkdir -p "$dest_root"

expected=""
while IFS= read -r rel || [ -n "$rel" ]; do
  case "$rel" in
    ""|\#*) continue ;;
  esac
  case "$rel" in
    /*|*..*|.*|*/.*)
      echo "refusing hidden publish path: $rel" >&2
      exit 1
      ;;
  esac
  src="$root/$rel"
  if [ ! -f "$src" ]; then
    echo "missing source file: $rel" >&2
    exit 1
  fi
  mkdir -p "$dest_root/$(dirname "$rel")"
  cp "$src" "$dest_root/$rel"
  expected="${expected}${rel}"$'\n'
done < "$list"

if [ -n "${MISSING_SIZE_ENDPOINT:-}" ]; then
  node -e '
    const fs = require("fs");
    const endpoint = process.env.MISSING_SIZE_ENDPOINT;
    fs.writeFileSync(process.argv[1], "window.MISSING_SIZE_ENDPOINT = " + JSON.stringify(endpoint) + ";\n");
  ' "$dest_root/site-config.js"
fi

actual=""
while IFS= read -r file; do
  [ -n "$file" ] || continue
  rel="${file#"$dest_root"/}"
  case "$rel" in
    .*|*/.*)
      echo "hidden path leaked into public/: $rel" >&2
      exit 1
      ;;
  esac
  actual="${actual}${rel}"$'\n'
done < <(find "$dest_root" -type f | sort)

expected="$(printf '%s' "$expected" | sort)"
actual="$(printf '%s' "$actual" | sort)"
if [ "$expected" != "$actual" ]; then
  echo "public/ does not match scripts/published-files.txt" >&2
  echo "expected:" >&2
  printf '%s\n' "$expected" >&2
  echo "actual:" >&2
  printf '%s\n' "$actual" >&2
  exit 1
fi
