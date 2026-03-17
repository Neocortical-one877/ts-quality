#!/usr/bin/env sh
set -eu

# Compatibility alias for agents that look for scripts/ak-v2.sh.
# The canonical repo-local wrapper in this repo is scripts/ak.sh.
repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
exec "$repo_root/scripts/ak.sh" "$@"
