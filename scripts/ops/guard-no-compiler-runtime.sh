#!/usr/bin/env sh
set -eu
if grep -R --line-number 'react/compiler-runtime' src; then
  echo "ERROR: forbidden import react/compiler-runtime found in src/"
  exit 1
fi
echo "OK: no react/compiler-runtime imports found"
