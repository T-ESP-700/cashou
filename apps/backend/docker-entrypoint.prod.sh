#!/bin/sh
# Entrypoint de production du backend.
# `set -e` : si une migration échoue, le conteneur s'arrête (fail-fast) plutôt
# que de démarrer sur un schéma incohérent.
set -e

echo "[entrypoint] Migrations base APP (db-app)..."
cd /app/packages/@cashou/db-app
bunx prisma migrate deploy

echo "[entrypoint] Migrations base BACKOFFICE (db-backoffice)..."
cd /app/packages/@cashou/db-backoffice
bunx prisma migrate deploy

echo "[entrypoint] Démarrage du backend..."
cd /app
exec bun run apps/backend/src/index.ts
