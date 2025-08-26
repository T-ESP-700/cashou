# backend/Dockerfile
FROM oven/bun:1.2

WORKDIR /app

# Copy package files from the monorepo root
COPY package.json bun.lockb* ./
COPY bunfig.toml ./
COPY tsconfig.json ./

# Copy workspace packages
COPY apps/backend/package.json ./apps/backend/
COPY packages/@cashou/db-app/package.json ./packages/@cashou/db-app/
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

# Go back to app root
WORKDIR /app

EXPOSE 3000

CMD ["bun", "run", "apps/backend/src/index.ts"]
