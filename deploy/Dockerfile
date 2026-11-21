# Multi-stage build. `builder` doubles as the tools image (migrations, seed, staff accounts).
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# Fixed uid so the host storage folder can be chowned to it (see docs/RUNBOOK.md). 10001: no user on the shared VPS has it, so other sites cannot read Vikkaa files.
RUN groupadd -r -g 10001 app && useradd -r -u 10001 -g app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
