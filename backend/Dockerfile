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

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["bun", "run", "start"]
