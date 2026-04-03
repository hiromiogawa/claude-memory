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

FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

WORKDIR /app
COPY --from=builder /app .

CMD ["node", "packages/mcp-server/dist/index.js"]
