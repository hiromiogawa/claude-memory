FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./
COPY packages/ packages/

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-slim AS runner

WORKDIR /app
COPY --from=builder /app .

CMD ["node", "packages/mcp-server/dist/index.js"]
