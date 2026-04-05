FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./
COPY packages/ packages/
COPY scripts/ scripts/

RUN pnpm install --frozen-lockfile
RUN pnpm build

# Pre-download the ONNX embedding model so it's cached in the image
# Use pnpm exec to ensure correct module resolution with hoist=false
RUN pnpm --filter @claude-memory/embedding-onnx exec node -e " \
  import('./dist/onnx-embedding-provider.js').then(async (m) => { \
    const p = new m.OnnxEmbeddingProvider({ modelName: 'intfloat/multilingual-e5-small' }); \
    const v = await p.embed('warmup'); \
    console.log('Model cached. Dim:', v.length); \
  }).catch(e => { console.error(e); process.exit(1); }) \
"

# Save built dist files
RUN find packages -name 'dist' -type d | tar cf /tmp/dist.tar -T -

# Reinstall production dependencies only (no devDeps)
RUN rm -rf node_modules packages/*/node_modules
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Restore built dist files over the prod-only install
RUN tar xf /tmp/dist.tar

# Remove source files and test artifacts not needed at runtime
RUN find packages -name 'src' -type d -exec rm -rf {} + 2>/dev/null; \
    find packages -name 'tests' -type d -exec rm -rf {} + 2>/dev/null; \
    find packages -name '*.test.ts' -delete 2>/dev/null; \
    rm -rf packages/*/tsconfig.json packages/*/vitest.config.ts /tmp/dist.tar; \
    true

FROM node:22-slim AS runner

WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
# Copy ONNX model cache
COPY --from=builder /root/.cache /root/.cache

CMD ["node", "packages/mcp-server/dist/index.js"]
