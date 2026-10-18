#!/usr/bin/env bash
set -euo pipefail

# Usage: ./build_prod.sh [docker-user]
# Or: DOCKER_USER=your-user ./build_prod.sh
# Run `docker login --username <docker-user>` before using this script.
# The timestamp uses the local timezone (override with TZ=UTC if desired).
if (( $# > 1 )); then
  echo "Usage: $0 [docker-user]" >&2
  exit 1
fi
docker_user="${1:-${DOCKER_USER:-vildibald}}"

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$project_dir"

command -v docker >/dev/null || { echo "Docker is required." >&2; exit 1; }
command -v git >/dev/null || { echo "Git is required." >&2; exit 1; }

build_time="$(date +%Y%m%d%H%M%S)"
commit_sha="$(git rev-parse --verify HEAD)"
image="${docker_user}/drawdb:${build_time}-${commit_sha:0:8}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Warning: building the current working tree, including uncommitted changes; the tag identifies HEAD." >&2
fi

echo "Building ${image}"
docker build --pull --file Dockerfile --tag "$image" .

echo "Pushing ${image}"
docker push "$image"

echo "Published ${image}"
