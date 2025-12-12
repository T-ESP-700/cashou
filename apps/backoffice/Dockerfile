# backoffice/Dockerfile
FROM oven/bun:1.2

WORKDIR /app

# Copy package files from the monorepo root
COPY package.json bun.lockb* ./
COPY bunfig.toml ./
COPY tsconfig.json ./
COPY .env.docker ./.env

# Copy workspace packages
COPY apps/backoffice/package.json ./apps/backoffice/
COPY packages/@cashou/api/package.json ./packages/@cashou/api/
COPY packages/@cashou/db-backoffice/package.json ./packages/@cashou/db-backoffice/
COPY packages/@cashou/ui/package.json ./packages/@cashou/ui/

# Install dependencies
RUN bun install

# Copy source code
COPY apps/backoffice ./apps/backoffice
COPY packages ./packages

WORKDIR /app/apps/backoffice

EXPOSE 5173

# Run in dev mode for now
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "5173"]
