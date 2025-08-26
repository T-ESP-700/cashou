# backend/Dockerfile
FROM oven/bun:1.0

WORKDIR /app

# Copier les fichiers de dépendances du backend
COPY package.json bun.lock ./

# Installer les dépendances du backend
RUN bun install

# Copier le code source du backend
COPY . .

# Générer le client Prisma avec le bon chemin
RUN bunx prisma generate --schema=prisma/app/schema.prisma

# Vérifier que le client a été généré
RUN ls -la node_modules/.prisma/client/

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["bun", "run", "start"]
