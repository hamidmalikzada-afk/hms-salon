#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Checking backend syntax"
for f in "$ROOT_DIR"/backend/config/*.js \
         "$ROOT_DIR"/backend/controllers/*.js \
         "$ROOT_DIR"/backend/middleware/*.js \
         "$ROOT_DIR"/backend/routes/*.js \
         "$ROOT_DIR"/backend/utils/*.js \
         "$ROOT_DIR"/backend/server.js; do
  node --check "$f"
done

echo "==> Linting frontend"
(cd "$ROOT_DIR/frontend" && npm run lint)

echo "==> Building frontend"
(cd "$ROOT_DIR/frontend" && npm run build)

echo "==> Validating Docker Compose"
(cd "$ROOT_DIR" && docker compose config >/dev/null)

echo "==> Formatting check for Terraform"
(cd "$ROOT_DIR" && terraform fmt -check -recursive)

echo "All DevOps checks passed."
