FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
# Fallback toolchain for better-sqlite3 when no prebuilt binary matches the platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Page-data collection imports src/db/client.ts, which opens the SQLite file at module load, so the directory
# must exist (.dockerignore strips data/). The build-time DB stays in this stage; the runtime stage never copies it.
# Better Auth also throws during that step without a secret; the placeholder is scoped to this command and never
# reaches the runtime stage, which must be given a real BETTER_AUTH_SECRET.
RUN mkdir -p data && BETTER_AUTH_SECRET=build-only-placeholder pnpm build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
RUN mkdir -p data && chown node:node data

USER node
VOLUME /app/data
EXPOSE 3000
CMD ["node", "server.js"]
