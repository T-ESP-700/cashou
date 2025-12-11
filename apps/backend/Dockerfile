# backend/Dockerfile
FROM oven/bun:1.2

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files from the monorepo root
COPY package.json bun.lockb* ./
COPY bunfig.toml ./
COPY tsconfig.json ./
COPY .env.docker ./.env

# Copy workspace packages
COPY apps/backend/package.json ./apps/backend/
COPY packages/@cashou/db-app/package.json ./packages/@cashou/db-app/
COPY packages/@cashou/db-backoffice/package.json ./packages/@cashou/db-backoffice/
COPY packages/@cashou/auth/package.json ./packages/@cashou/auth/
COPY packages/@cashou/utils/package.json ./packages/@cashou/utils/

# Install dependencies
RUN bun install

# Copy source code
COPY apps/backend ./apps/backend
COPY packages ./packages

# Generate Prisma client
WORKDIR /app/packages/@cashou/db-app
RUN bunx prisma generate
WORKDIR /app/packages/@cashou/db-backoffice
RUN bunx prisma generate

# Go back to app root
WORKDIR /app

EXPOSE 3000

# En dev: hot reload avec --watch, en prod: exécution directe
CMD if [ "$NODE_ENV" = "production" ]; then \
      bun run apps/backend/src/index.ts; \
    else \
      bun --watch run apps/backend/src/index.ts; \
    fi
