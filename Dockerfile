FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./
COPY packages/ packages/
COPY scripts/ scripts/

RUN pnpm install --frozen-lockfile
RUN pnpm build

# ONNX embedding モデルは image に焼き込まない。実行時に host の ~/.cache/huggingface/
# を bind mount 経由で共有し、host 側の session-start/end hook とキャッシュを一本化する。
# docker-compose.yml の `volumes` 設定、または `docker run` の `-v` オプションを参照。

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

CMD ["node", "packages/mcp-server/dist/index.js"]
