FROM oven/bun:1.0

WORKDIR /app

# Copier les fichiers de configuration du monorepo
COPY package.json bun.lock* ./
COPY backend/package.json ./backend/package.json
COPY backoffice/package.json ./backoffice/package.json

# Installer toutes les dépendances (workspaces)
RUN bun install

# Copier le code source du backend
COPY backend/ ./backend/

# Se déplacer dans le backend
WORKDIR /app/backend

# Générer le client Prisma
RUN bunx prisma generate --schema=prisma/app/schema.prisma

EXPOSE 3000

# Utiliser le mode développement avec --watch
CMD ["bun", "--watch", "--hot", "src/index.ts"]
