#!/usr/bin/env bun

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

// Script pour générer le schéma Prisma de better-auth

const generateSchema = async () => {
  console.log('Génération du schéma better-auth...');
  
  // Configuration de better-auth
  const auth = betterAuth({
    database: prismaAdapter(new PrismaClient(), {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
    },
  });

  // Récupérer le schéma
  const schema = await auth.api.generateSchema({
    adapter: 'prisma',
    provider: 'postgresql',
  });

  console.log('Schéma généré:');
  console.log(schema);
  
  // Écrire le schéma dans un fichier
  const fs = require('fs');
  fs.writeFileSync('prisma/better-auth-schema.prisma', schema);
  console.log('Schéma sauvegardé dans prisma/better-auth-schema.prisma');
};

generateSchema().catch(console.error);