FROM node:24 AS base
LABEL authors="Francesco Giovannini <fgiova@fgiova.com>"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN mkdir -p /app/localstack-explorer-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml /app/localstack-explorer-builder/.
COPY pnpm-workspace.yaml /app/localstack-explorer-builder/.
COPY package.json /app/localstack-explorer-builder/.
COPY tsconfig.base.json /app/localstack-explorer-builder/.
COPY packages /app/localstack-explorer-builder/packages
COPY icons /app/localstack-explorer-builder/icons

FROM base AS build
WORKDIR /app/localstack-explorer-builder
RUN cd /app/localstack-explorer-builder
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build:standalone

FROM node:24-slim AS deps
RUN mkdir -p /app/localstack-explorer
WORKDIR /app/localstack-explorer
COPY --from=build /app/localstack-explorer-builder/packages/backend/package.json .
RUN npm i --omit=dev

FROM node:24-slim
WORKDIR /app/localstack-explorer
COPY --from=deps /app/localstack-explorer/node_modules ./node_modules
COPY --from=build /app/localstack-explorer-builder/packages/backend/dist/. .

ENTRYPOINT ["node", "index.js"]
