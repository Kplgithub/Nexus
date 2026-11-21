# syntax=docker/dockerfile:1.7
# Build from the repository root:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=https://example.com -t nexus-web .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_NOINDEX=false
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_NOINDEX=$NEXT_PUBLIC_NOINDEX NEXT_OUTPUT=standalone \
    API_INTERNAL_URL=http://api:4000
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @nexus/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
# Pages that read listings are rendered on request, so the API is not needed at build time.
RUN pnpm --filter @nexus/shared build && pnpm --filter @nexus/web build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system nexus && useradd --system --gid nexus --home /app nexus
COPY --from=build --chown=nexus:nexus /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nexus:nexus /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nexus:nexus /repo/apps/web/public ./apps/web/public
# India IP → city table for the home page city (src/lib/geo.ts reads it from the app folder).
COPY --from=build --chown=nexus:nexus /repo/apps/web/data ./apps/web/data
USER nexus
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
