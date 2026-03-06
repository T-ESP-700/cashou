/**
 * Crée le compte de développement par défaut (test@gmail.com / azerty123456)
 * utilisé par l'application mobile en mode dev.
 * Idempotent : ne fait rien si le compte existe déjà.
 */

import { PrismaClient } from '@cashou/db-app';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEV_EMAIL = 'test@gmail.com';
const DEV_PASSWORD = 'azerty123456';
const DEV_NAME = 'Dev User';

async function main() {
  console.log('🔧 Vérification du compte de développement...');

  const existingUser = await prisma.user.findUnique({
    where: { email: DEV_EMAIL },
  });

  if (existingUser) {
    console.log(`ℹ️  Le compte dev existe déjà (${DEV_EMAIL})`);
    return;
  }

  const hashedPassword = await bcrypt.hash(DEV_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      email: DEV_EMAIL,
      name: DEV_NAME,
      emailVerified: true,
      levelId: 1,
      points: 0,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: hashedPassword,
    },
  });

  console.log('✅ Compte de développement créé !');
  console.log(`   📧 Email: ${DEV_EMAIL}`);
  console.log(`   🔑 Mot de passe: ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de la création du compte dev :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
