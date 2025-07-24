
FROM oven/bun:1.0

WORKDIR /app

# Copier les fichiers de configuration du monorepo
COPY package.json bun.lock ./
COPY backend/package.json ./backend/package.json
COPY backoffice/package.json ./backoffice/package.json

# Installer toutes les dépendances (workspaces)
RUN bun install

# Copier le code source du backoffice
COPY backoffice/ ./backoffice/

# Se déplacer dans le backoffice
WORKDIR /app/backoffice

EXPOSE 5173

# Utiliser le mode développement avec --watch (pas de build)
CMD ["bun", "--watch", "index.ts"]