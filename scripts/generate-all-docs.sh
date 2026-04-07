#!/usr/bin/env bash
set -euo pipefail

echo "=== Generating MCP tool reference ==="
pnpm --filter @claude-memory/mcp-server docs:generate

echo "=== Generating dependency graph ==="
mkdir -p docs/generated
pnpm docs:dep-graph

echo "=== Generating DB schema (requires running DB) ==="
if [ "${SKIP_DB_DOCS:-}" = "true" ]; then
  echo "Skipping DB schema generation (SKIP_DB_DOCS=true)"
else
  pnpm docs:schema
fi

echo "=== All docs generated ==="
