# backend/Dockerfile
FROM oven/bun:1.0

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json bun.lock ./

# Installer les dépendances
RUN bun install

# Copier le code source
COPY . .

# Générer le client Prisma
RUN bunx prisma generate --schema=prisma/app/schema.prisma

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["bun", "run", "start"]
